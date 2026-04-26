-- =====================================================
-- Migration: 20260426010000_phase_2_category_a_backfill.sql
-- =====================================================
-- Description: Phase 2 of the lesson-submission Tier-1 orphan recovery.
-- Backfills lessons.original_submission_id for 17 approved-but-unpublished
-- submissions whose Google Doc already lives in the library exactly once
-- (Category A — direct doc-id match, no multi-match, lesson row not broken).
--
-- Reasoning artifact: scripts/orphan-recovery/phase-2-category-a-backfill.ts
-- (PR #445 → 223d8ac). The script's plan output identified the same 17 rows
-- listed below; this migration is the canonical write path for the UPDATE,
-- routed through the standard TEST → PROD pipeline rather than MCP-direct.
--
-- Audit-only: only lessons.original_submission_id is touched. No content,
-- embeddings, or search vectors change.
--
-- Idempotency: the `WHERE original_submission_id IS NULL` guard makes
-- re-application a no-op. On TEST DB the UPDATE matches 0 rows (TEST has
-- no orphans matching these IDs); on PROD it matches exactly 17.
--
-- Held out from this batch (separate manual decision needed):
--   - submission ea271d13-78db-437c-aa9f-594ce567f90c "Applesauce lesson plan"
--     (multi-match — google_doc_id maps to 2 lessons rows)
--   - submission 16603243-0eed-4cc8-886f-f9c37d25276f "Green 'Acai' Bowls
--     (Mobile Education)" (lesson row 11oY-EaKF7FT... is broken: title
--     'Unknown', summary 'Error processing lesson')

-- =====================================================
-- CHANGES
-- =====================================================

UPDATE lessons l
   SET original_submission_id = m.submission_id
  FROM (VALUES
    ('16EKgsyMoog70qEuzSTigFcfQVSJKoSrfrCaQyHvt4hM', '86570c1c-6ea9-4ed7-9357-df8d9725af0b'::uuid), -- Uzbek-Korean Carrot Salad
    ('18sSQUw48YOS12Egcpbk-N4MR3HjN-CnaoI64nzoEElM', '96b1306d-c01d-44e1-a530-11d20a2052ea'::uuid), -- School Lunch Heroes
    ('1B-4jTGPsOXmFJp-q-4JpMJ3e7Qw5I92aOxtgWHD6UNU', 'dfd11c22-6145-432d-9024-41a2758da618'::uuid), -- Farm Workers & Pesticides
    ('1bVDe707ybEfXjRhURKAmvdArp200ufJDnAxp3xx_qzw', 'f508c9d6-7913-43b3-8067-a6057b24f9b5'::uuid), -- The Lorax Debate
    ('1cCe0ugBM572aGRojx1RfR6wE5FuBA3CjFetD8NKffvs', '1ce2b88a-d0e9-4924-8914-5ba55145396b'::uuid), -- Pesticides
    ('1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg', 'fa480029-d8bf-489c-b8de-34face593b97'::uuid), -- Hummus and Pita
    ('1ejnMz5mRDOi4NIPakPgEpKCKpnPz7yx-SAg07-FlTr4', 'e1dcc4e3-3f34-4ade-821d-1d0c7e388667'::uuid), -- Edible Flower Collages & Salad
    ('1gHg6aknsieTv59SaRFx0HJy9Zft4oKFdUXiX3MzCd8A', '505ac241-4c7b-42a7-8361-c4a38aa4a7cc'::uuid), -- Juneteenth
    ('1gTwAkYvbhfAUBntDtseYQVv4QwljBG6NhuJSbzjfyFA', 'cd528c74-e22c-4636-838b-374ed46c4d5e'::uuid), -- Bug Camouflage
    ('1JATiVuztETGhMlX6Z9rflKy150-0qMSzeGHAsN6fNaE', '2658b09e-aa74-4100-bffc-bfda9a303b13'::uuid), -- 3K-1 Indoor Garden Jobs
    ('1Sh9vw7Co-Y5Sl4q-l4e1zUEojDscaxgof8AnWwlMI9A', '1f40b372-55ea-4d81-b36e-6df695e77109'::uuid), -- Garden Celebration
    ('1sM22IgvZYFKd18ALGaRANvLLopJVY7d97b8iJARJak0', 'b7fb8796-90ee-4da1-bcd9-1cdf244e6f07'::uuid), -- The Ugly Vegetables
    ('1U37lyK4-ywV1d-NQmj__f3gFdLAvIuDh8P30UC9mwFE', '2f5e5d72-1056-450f-bd1a-d68359733ba8'::uuid), -- The Honeybee Man
    ('1UmWmKPM-RNKCwVU4p3HbroX3b90NHUDpT6E_grpguUI', 'ab06dde4-d656-47b8-8b91-c31f0c216be8'::uuid), -- Aguas Frescas
    ('1Us8lS78zALqD9be_Wj-cIO3uhbBd8m94ougM6NDqPTc', '4a2e3163-9eb7-41a1-922f-dde96d554d4f'::uuid), -- Roly Poly Lunch
    ('1wS7hhLPp7jv1mvZyeSjfCXHBp84k6UA6ONcoEyYk0DM', '975fdda2-c43d-4add-9513-0d980c6feda6'::uuid), -- All About Roly Polys
    ('1YrnJcoM27Olc2qhm_AaCwnf9mUd3b5Ypgiv6_2ekhwE', '63435667-2556-465a-8314-4809b7c6b308'::uuid)  -- Our Little Garden Harvest
  ) AS m(lesson_id, submission_id)
 WHERE l.lesson_id = m.lesson_id
   AND l.original_submission_id IS NULL;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Snapshots of the affected lessons rows are stored locally in
-- scripts/orphan-recovery/snapshots/ (gitignored). To revert this batch on
-- PROD, run the inverse UPDATE setting original_submission_id back to NULL
-- for the same 17 (lesson_id, submission_id) pairs. The pairs are restated
-- in full here so this comment is self-contained in an emergency:
--
-- UPDATE lessons l
--    SET original_submission_id = NULL
--   FROM (VALUES
--     ('16EKgsyMoog70qEuzSTigFcfQVSJKoSrfrCaQyHvt4hM', '86570c1c-6ea9-4ed7-9357-df8d9725af0b'::uuid),
--     ('18sSQUw48YOS12Egcpbk-N4MR3HjN-CnaoI64nzoEElM', '96b1306d-c01d-44e1-a530-11d20a2052ea'::uuid),
--     ('1B-4jTGPsOXmFJp-q-4JpMJ3e7Qw5I92aOxtgWHD6UNU', 'dfd11c22-6145-432d-9024-41a2758da618'::uuid),
--     ('1bVDe707ybEfXjRhURKAmvdArp200ufJDnAxp3xx_qzw', 'f508c9d6-7913-43b3-8067-a6057b24f9b5'::uuid),
--     ('1cCe0ugBM572aGRojx1RfR6wE5FuBA3CjFetD8NKffvs', '1ce2b88a-d0e9-4924-8914-5ba55145396b'::uuid),
--     ('1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg', 'fa480029-d8bf-489c-b8de-34face593b97'::uuid),
--     ('1ejnMz5mRDOi4NIPakPgEpKCKpnPz7yx-SAg07-FlTr4', 'e1dcc4e3-3f34-4ade-821d-1d0c7e388667'::uuid),
--     ('1gHg6aknsieTv59SaRFx0HJy9Zft4oKFdUXiX3MzCd8A', '505ac241-4c7b-42a7-8361-c4a38aa4a7cc'::uuid),
--     ('1gTwAkYvbhfAUBntDtseYQVv4QwljBG6NhuJSbzjfyFA', 'cd528c74-e22c-4636-838b-374ed46c4d5e'::uuid),
--     ('1JATiVuztETGhMlX6Z9rflKy150-0qMSzeGHAsN6fNaE', '2658b09e-aa74-4100-bffc-bfda9a303b13'::uuid),
--     ('1Sh9vw7Co-Y5Sl4q-l4e1zUEojDscaxgof8AnWwlMI9A', '1f40b372-55ea-4d81-b36e-6df695e77109'::uuid),
--     ('1sM22IgvZYFKd18ALGaRANvLLopJVY7d97b8iJARJak0', 'b7fb8796-90ee-4da1-bcd9-1cdf244e6f07'::uuid),
--     ('1U37lyK4-ywV1d-NQmj__f3gFdLAvIuDh8P30UC9mwFE', '2f5e5d72-1056-450f-bd1a-d68359733ba8'::uuid),
--     ('1UmWmKPM-RNKCwVU4p3HbroX3b90NHUDpT6E_grpguUI', 'ab06dde4-d656-47b8-8b91-c31f0c216be8'::uuid),
--     ('1Us8lS78zALqD9be_Wj-cIO3uhbBd8m94ougM6NDqPTc', '4a2e3163-9eb7-41a1-922f-dde96d554d4f'::uuid),
--     ('1wS7hhLPp7jv1mvZyeSjfCXHBp84k6UA6ONcoEyYk0DM', '975fdda2-c43d-4add-9513-0d980c6feda6'::uuid),
--     ('1YrnJcoM27Olc2qhm_AaCwnf9mUd3b5Ypgiv6_2ekhwE', '63435667-2556-465a-8314-4809b7c6b308'::uuid)
--   ) AS m(lesson_id, submission_id)
--  WHERE l.lesson_id = m.lesson_id
--    AND l.original_submission_id = m.submission_id;
