-- =====================================================
-- Drive-provenance DB assertions (LOCAL ONLY).
-- =====================================================
-- Deterministic SQL-level tests for migration
-- 20260717144705_drive_provenance_columns_and_rpcs.sql:
--   * CHECK constraints (attribution/source enums, all-or-none tuple,
--     native-doc-only creator, name hygiene);
--   * complete_review_atomic approve_new / approve_update propagation,
--     explicit-omit + invalid-input safety, version snapshot,
--     needs_revision non-publication;
--   * search_lessons 'modified' sort = drive_modified_at DESC NULLS LAST
--     with deterministic title/lesson_id tie-breakers.
--
-- Run against the LOCAL stack only, after `supabase db reset`:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--     -v ON_ERROR_STOP=1 -f scripts/drive-provenance/drive-provenance-db-assertions.sql
--
-- The whole file runs in ONE transaction and ends with ROLLBACK — it never
-- persists anything. Every assertion RAISEs on failure (ON_ERROR_STOP makes
-- psql exit nonzero). Synthetic identities/ids only.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------
-- Setup: a reviewer id (any seeded auth user) + a lesson-free workspace.
-- ---------------------------------------------------------------
CREATE TEMP TABLE _t_ctx ON COMMIT DROP AS
SELECT (SELECT id FROM auth.users LIMIT 1) AS reviewer_id;

DO $$
BEGIN
  IF (SELECT reviewer_id FROM _t_ctx) IS NULL THEN
    RAISE EXCEPTION 'SETUP FAILED: no seeded auth user — run supabase db reset first';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 1. CHECK constraints on lessons (same set exists on lesson_submissions
--    and lesson_versions; representative-table coverage + one cross-check).
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_ok boolean;
BEGIN
  -- 1a. attribution outside the enum rejected.
  BEGIN
    INSERT INTO public.lessons (lesson_id, title, summary, file_link,
      drive_mime_type, drive_creator_name, drive_creator_attribution,
      drive_creator_source, drive_creator_verified_at)
    VALUES ('T-CONSTRAINT-1', 't', 's', '#',
      'application/vnd.google-apps.document', 'Jane Doe', 'owner',
      'reviewer_confirmed', now());
    RAISE EXCEPTION 'ASSERT 1a FAILED: bad attribution accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 1b. source outside the enum rejected.
  BEGIN
    INSERT INTO public.lessons (lesson_id, title, summary, file_link,
      drive_mime_type, drive_creator_name, drive_creator_attribution,
      drive_creator_source, drive_creator_verified_at)
    VALUES ('T-CONSTRAINT-2', 't', 's', '#',
      'application/vnd.google-apps.document', 'Jane Doe', 'created',
      'guessed', now());
    RAISE EXCEPTION 'ASSERT 1b FAILED: bad source accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 1c. partial creator tuple (name without the rest) rejected.
  BEGIN
    INSERT INTO public.lessons (lesson_id, title, summary, file_link,
      drive_mime_type, drive_creator_name)
    VALUES ('T-CONSTRAINT-3', 't', 's', '#',
      'application/vnd.google-apps.document', 'Jane Doe');
    RAISE EXCEPTION 'ASSERT 1c FAILED: partial creator tuple accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 1d. creator on a non-native MIME rejected.
  BEGIN
    INSERT INTO public.lessons (lesson_id, title, summary, file_link,
      drive_mime_type, drive_creator_name, drive_creator_attribution,
      drive_creator_source, drive_creator_verified_at)
    VALUES ('T-CONSTRAINT-4', 't', 's', '#',
      'application/pdf', 'Jane Doe', 'created', 'reviewer_confirmed', now());
    RAISE EXCEPTION 'ASSERT 1d FAILED: creator on non-native MIME accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 1e. unsafe names rejected: email, URL, www, untrimmed, overlong.
  DECLARE
    bad_name text;
  BEGIN
    FOREACH bad_name IN ARRAY ARRAY[
      'jane@example.org',
      'see https://example.org',
      'www.example.org',
      ' Jane Doe',
      'Jane Doe ',
      -- tab-padded names survive btrim (spaces only) — the explicit
      -- [[:space:]] boundary conditions must reject them.
      E'Jane Doe\t',
      E'\tJane Doe',
      -- embedded control characters (one-line-name rule)
      E'Jane\nDoe',
      E'Jane\tDoe',
      repeat('x', 121)
    ] LOOP
      BEGIN
        INSERT INTO public.lessons (lesson_id, title, summary, file_link,
          drive_mime_type, drive_creator_name, drive_creator_attribution,
          drive_creator_source, drive_creator_verified_at)
        VALUES ('T-CONSTRAINT-5', 't', 's', '#',
          'application/vnd.google-apps.document', bad_name, 'created',
          'reviewer_confirmed', now());
        RAISE EXCEPTION 'ASSERT 1e FAILED: unsafe name % accepted', bad_name;
      EXCEPTION WHEN check_violation THEN NULL;
      END;
    END LOOP;
  END;

  -- 1f. a fully-valid tuple on a native doc IS accepted (and then removed).
  INSERT INTO public.lessons (lesson_id, title, summary, file_link,
    drive_mime_type, drive_creator_name, drive_creator_attribution,
    drive_creator_source, drive_creator_verified_at)
  VALUES ('T-CONSTRAINT-OK', 't', 's', '#',
    'application/vnd.google-apps.document', 'María-José Álvarez', 'adapted',
    'drive_activity', now());
  SELECT EXISTS(SELECT 1 FROM public.lessons WHERE lesson_id = 'T-CONSTRAINT-OK') INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'ASSERT 1f FAILED: valid tuple rejected'; END IF;
  DELETE FROM public.lessons WHERE lesson_id = 'T-CONSTRAINT-OK';

  -- 1g. cross-check: the same tuple constraint exists on lesson_submissions.
  BEGIN
    INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
      drive_mime_type, drive_creator_name)
    VALUES ((SELECT reviewer_id FROM _t_ctx), 'https://docs.google.com/document/d/x/edit', 'x',
      'submitted', 'application/vnd.google-apps.document', 'Jane Doe');
    RAISE EXCEPTION 'ASSERT 1g FAILED: partial tuple accepted on lesson_submissions';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'PASS 1: CHECK constraints';
END $$;

-- ---------------------------------------------------------------
-- 2. complete_review_atomic — approve_new propagation.
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_reviewer uuid := (SELECT reviewer_id FROM _t_ctx);
  v_sub uuid;
  v_lesson_id text;
  l public.lessons%ROWTYPE;
  s public.lesson_submissions%ROWTYPE;
BEGIN
  -- 2a. valid creator on a native doc → full tuple + dates on the new lesson
  --     AND on the submission; source/verified are server-derived.
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/TESTFILE-A/edit', 'TESTFILE-A', 'submitted',
    'Test A', 'content',
    'TESTFILE-A', 'application/vnd.google-apps.document',
    '2024-01-15T12:00:00Z', '2025-03-01T12:00:00Z', '2026-07-17T00:00:00Z')
  RETURNING id INTO v_sub;

  v_lesson_id := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_new',
    '{"title":"Test A","summary":"s","driveCreatorAttribution":"created","driveCreatorName":"Jane Doe"}'::jsonb,
    '');

  SELECT * INTO l FROM public.lessons WHERE lesson_id = v_lesson_id;
  IF l.drive_file_id IS DISTINCT FROM 'TESTFILE-A'
     OR l.drive_mime_type IS DISTINCT FROM 'application/vnd.google-apps.document'
     OR l.drive_created_at IS DISTINCT FROM '2024-01-15T12:00:00Z'::timestamptz
     OR l.drive_modified_at IS DISTINCT FROM '2025-03-01T12:00:00Z'::timestamptz
     OR l.drive_metadata_synced_at IS DISTINCT FROM '2026-07-17T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'ASSERT 2a FAILED: file/date fields not copied to new lesson';
  END IF;
  IF l.drive_creator_name IS DISTINCT FROM 'Jane Doe'
     OR l.drive_creator_attribution IS DISTINCT FROM 'created'
     OR l.drive_creator_source IS DISTINCT FROM 'reviewer_confirmed'
     OR l.drive_creator_verified_at IS NULL THEN
    RAISE EXCEPTION 'ASSERT 2a FAILED: creator tuple not saved on new lesson';
  END IF;
  SELECT * INTO s FROM public.lesson_submissions WHERE id = v_sub;
  IF s.drive_creator_name IS DISTINCT FROM 'Jane Doe'
     OR s.drive_creator_source IS DISTINCT FROM 'reviewer_confirmed' THEN
    RAISE EXCEPTION 'ASSERT 2a FAILED: creator tuple not saved on submission';
  END IF;

  -- 2b. explicit omit → all-null creator, dates still copied.
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/TESTFILE-B/edit', 'TESTFILE-B', 'submitted',
    'Test B', 'content',
    'TESTFILE-B', 'application/vnd.google-apps.document',
    '2024-02-01T12:00:00Z', '2025-02-01T12:00:00Z', now())
  RETURNING id INTO v_sub;

  v_lesson_id := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_new',
    '{"title":"Test B","summary":"s","driveCreatorAttribution":"omit","driveCreatorName":"Should Be Ignored"}'::jsonb,
    '');
  SELECT * INTO l FROM public.lessons WHERE lesson_id = v_lesson_id;
  IF l.drive_creator_name IS NOT NULL OR l.drive_creator_attribution IS NOT NULL
     OR l.drive_creator_source IS NOT NULL OR l.drive_creator_verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 2b FAILED: explicit omit still published a creator';
  END IF;
  IF l.drive_created_at IS NULL OR l.drive_modified_at IS NULL THEN
    RAISE EXCEPTION 'ASSERT 2b FAILED: dates should copy even on omit';
  END IF;

  -- 2c-pre. tab-padded name (survives btrim) → all-null creator.
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/TESTFILE-C0/edit', 'TESTFILE-C0', 'submitted',
    'Test C0', 'content',
    'TESTFILE-C0', 'application/vnd.google-apps.document', now(), now(), now())
  RETURNING id INTO v_sub;
  v_lesson_id := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_new',
    jsonb_build_object('title', 'Test C0', 'summary', 's',
      'driveCreatorAttribution', 'created', 'driveCreatorName', E'Jane Doe\t'),
    '');
  SELECT * INTO l FROM public.lessons WHERE lesson_id = v_lesson_id;
  IF l.drive_creator_name IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 2c-pre FAILED: tab-padded name published';
  END IF;

  -- 2c. unsafe name (email) → all-null creator.
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/TESTFILE-C/edit', 'TESTFILE-C', 'submitted',
    'Test C', 'content',
    'TESTFILE-C', 'application/vnd.google-apps.document', now(), now(), now())
  RETURNING id INTO v_sub;
  v_lesson_id := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_new',
    '{"title":"Test C","summary":"s","driveCreatorAttribution":"created","driveCreatorName":"jane@example.org"}'::jsonb,
    '');
  SELECT * INTO l FROM public.lessons WHERE lesson_id = v_lesson_id;
  IF l.drive_creator_name IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 2c FAILED: email-like name published';
  END IF;

  -- 2d. non-native MIME (imported Word) → creator refused even when named.
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/TESTFILE-D/edit', 'TESTFILE-D', 'submitted',
    'Test D', 'content',
    'TESTFILE-D', 'application/pdf', now(), now(), now())
  RETURNING id INTO v_sub;
  v_lesson_id := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_new',
    '{"title":"Test D","summary":"s","driveCreatorAttribution":"created","driveCreatorName":"Jane Doe"}'::jsonb,
    '');
  SELECT * INTO l FROM public.lessons WHERE lesson_id = v_lesson_id;
  IF l.drive_creator_name IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 2d FAILED: creator published for non-native MIME';
  END IF;

  -- 2e. reviewer-supplied source/verified are IGNORED (server-derived only).
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/TESTFILE-E/edit', 'TESTFILE-E', 'submitted',
    'Test E', 'content',
    'TESTFILE-E', 'application/vnd.google-apps.document', now(), now(), now())
  RETURNING id INTO v_sub;
  v_lesson_id := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_new',
    '{"title":"Test E","summary":"s","driveCreatorAttribution":"adapted","driveCreatorName":"Jane Doe","driveCreatorSource":"drive_activity","driveCreatorVerifiedAt":"1999-01-01T00:00:00Z"}'::jsonb,
    '');
  SELECT * INTO l FROM public.lessons WHERE lesson_id = v_lesson_id;
  IF l.drive_creator_source IS DISTINCT FROM 'reviewer_confirmed'
     OR l.drive_creator_verified_at < now() - interval '1 minute' THEN
    RAISE EXCEPTION 'ASSERT 2e FAILED: client-controlled source/verified leaked through';
  END IF;

  RAISE NOTICE 'PASS 2: complete_review_atomic approve_new propagation';
END $$;

-- ---------------------------------------------------------------
-- 3. complete_review_atomic — approve_update replace + version snapshot,
--    and needs_revision non-publication.
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_reviewer uuid := (SELECT reviewer_id FROM _t_ctx);
  v_sub uuid;
  v_ret text;
  l public.lessons%ROWTYPE;
  ver record;
  s_before public.lesson_submissions%ROWTYPE;
  s_after public.lesson_submissions%ROWTYPE;
  v_lessons_count_before bigint;
  v_lessons_count_after bigint;
BEGIN
  -- Existing published lesson with OLD provenance (historical drive_activity creator).
  INSERT INTO public.lessons (lesson_id, title, summary, file_link,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at,
    drive_creator_name, drive_creator_attribution, drive_creator_source, drive_creator_verified_at)
  VALUES ('T-UPD-1', 'Old title', 'old summary', '#old',
    'OLDFILE', 'application/vnd.google-apps.document',
    '2020-01-01T00:00:00Z', '2021-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    'Old Creator', 'created', 'drive_activity', '2026-01-01T00:00:00Z');

  -- New submission against a DIFFERENT file, reviewer omits the creator.
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content, submission_type, original_lesson_id,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/NEWFILE/edit', 'NEWFILE', 'submitted',
    'New title', 'new content', 'update', 'T-UPD-1',
    'NEWFILE', 'application/vnd.google-apps.document',
    '2024-05-05T00:00:00Z', '2026-06-06T00:00:00Z', '2026-07-17T00:00:00Z')
  RETURNING id INTO v_sub;

  v_ret := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_update',
    '{"title":"New title","summary":"new"}'::jsonb,
    '', 'T-UPD-1');
  IF v_ret IS DISTINCT FROM 'T-UPD-1' THEN
    RAISE EXCEPTION 'ASSERT 3 FAILED: approve_update returned %', v_ret;
  END IF;

  -- 3a. snapshot holds the PRE-update provenance (all nine columns).
  SELECT * INTO ver FROM public.lesson_versions
  WHERE lesson_id = 'T-UPD-1' ORDER BY archived_at DESC LIMIT 1;
  IF ver.drive_file_id IS DISTINCT FROM 'OLDFILE'
     OR ver.drive_created_at IS DISTINCT FROM '2020-01-01T00:00:00Z'::timestamptz
     OR ver.drive_modified_at IS DISTINCT FROM '2021-01-01T00:00:00Z'::timestamptz
     OR ver.drive_creator_name IS DISTINCT FROM 'Old Creator'
     OR ver.drive_creator_attribution IS DISTINCT FROM 'created'
     OR ver.drive_creator_source IS DISTINCT FROM 'drive_activity'
     OR ver.drive_creator_verified_at IS NULL
     OR ver.drive_metadata_synced_at IS NULL THEN
    RAISE EXCEPTION 'ASSERT 3a FAILED: version snapshot missing pre-update provenance';
  END IF;

  -- 3b. lesson now carries the NEW submission's file/dates, and the ABSENT
  --     creator choice cleared the old attribution (safety > preservation).
  SELECT * INTO l FROM public.lessons WHERE lesson_id = 'T-UPD-1';
  IF l.drive_file_id IS DISTINCT FROM 'NEWFILE'
     OR l.drive_created_at IS DISTINCT FROM '2024-05-05T00:00:00Z'::timestamptz
     OR l.drive_modified_at IS DISTINCT FROM '2026-06-06T00:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'ASSERT 3b FAILED: lesson did not take the new submission file/dates';
  END IF;
  IF l.drive_creator_name IS NOT NULL OR l.drive_creator_attribution IS NOT NULL
     OR l.drive_creator_source IS NOT NULL OR l.drive_creator_verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 3b FAILED: stale creator survived approve_update without confirmation';
  END IF;

  -- 3c. needs_revision publishes nothing: no lessons write, and the
  --     submission's stored creator columns stay untouched.
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content,
    drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, drive_metadata_synced_at,
    drive_creator_name, drive_creator_attribution, drive_creator_source, drive_creator_verified_at)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/REVFILE/edit', 'REVFILE', 'submitted',
    'Rev title', 'content',
    'REVFILE', 'application/vnd.google-apps.document', now(), now(), now(),
    'Prior Round Name', 'created', 'reviewer_confirmed', now())
  RETURNING id INTO v_sub;
  SELECT * INTO s_before FROM public.lesson_submissions WHERE id = v_sub;
  SELECT count(*) INTO v_lessons_count_before FROM public.lessons;

  v_ret := public.complete_review_atomic(
    v_sub, v_reviewer, 'needs_revision',
    '{"driveCreatorAttribution":"created","driveCreatorName":"Different Name"}'::jsonb,
    'please fix');

  SELECT count(*) INTO v_lessons_count_after FROM public.lessons;
  IF v_lessons_count_after <> v_lessons_count_before OR v_ret IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 3c FAILED: needs_revision wrote a lesson';
  END IF;
  SELECT * INTO s_after FROM public.lesson_submissions WHERE id = v_sub;
  IF s_after.drive_creator_name IS DISTINCT FROM s_before.drive_creator_name THEN
    RAISE EXCEPTION 'ASSERT 3c FAILED: needs_revision mutated submission creator columns';
  END IF;

  RAISE NOTICE 'PASS 3: approve_update snapshot/replace + needs_revision safety';
END $$;

-- ---------------------------------------------------------------
-- 4. search_lessons — provenance result columns (PR-A scope).
--    Uses the TITLE sort, which is identical before and after PR-B's
--    modified-sort switch; the Drive-true 'modified' ORDER assertion lives in
--    drive-sort-assertions.sql (ships with PR-B's 20260717174811 migration).
-- ---------------------------------------------------------------
DO $$
DECLARE
  ids text[];
  creator_names text[];
BEGIN
  -- A clean, fully-controlled corpus.
  DELETE FROM public.lessons;

  INSERT INTO public.lessons (lesson_id, title, summary, file_link, drive_modified_at, drive_mime_type,
    drive_creator_name, drive_creator_attribution, drive_creator_source, drive_creator_verified_at)
  VALUES
    ('T-PROV-A', 'A-first',  's', '#', '2026-06-01T00:00:00Z', 'application/vnd.google-apps.document',
      'Jane Doe', 'created', 'drive_activity', now()),
    ('T-PROV-B', 'B-second', 's', '#', '2025-01-01T00:00:00Z', 'application/pdf',
      NULL, NULL, NULL, NULL),
    ('T-PROV-C', 'C-third',  's', '#', NULL, NULL, NULL, NULL, NULL, NULL);

  -- 4a. title sort is deterministic in BOTH PR states; provenance columns ride
  --     the result, creator only where stored.
  SELECT array_agg(r.lesson_id ORDER BY ord), array_agg(r.drive_creator_name ORDER BY ord)
  INTO ids, creator_names
  FROM (SELECT ROW_NUMBER() OVER () AS ord, * FROM public.search_lessons(order_by => 'title')) r;

  IF ids IS DISTINCT FROM ARRAY['T-PROV-A','T-PROV-B','T-PROV-C'] THEN
    RAISE EXCEPTION 'ASSERT 4a FAILED: title order was %', ids;
  END IF;
  IF creator_names[1] IS DISTINCT FROM 'Jane Doe'
     OR creator_names[2] IS NOT NULL OR creator_names[3] IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 4a FAILED: creator columns wrong in result: %', creator_names;
  END IF;

  -- 4b. retired rows stay hidden.
  UPDATE public.lessons SET retired_at = now() WHERE lesson_id = 'T-PROV-B';
  SELECT array_agg(r.lesson_id) INTO ids FROM public.search_lessons(order_by => 'title') r;
  IF 'T-PROV-B' = ANY(ids) THEN
    RAISE EXCEPTION 'ASSERT 4b FAILED: retired row surfaced';
  END IF;

  RAISE NOTICE 'PASS 4: search_lessons provenance result columns';
END $$;

ROLLBACK;
