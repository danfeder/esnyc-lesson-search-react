-- RLS fix for publishing approved submissions into lessons
-- Apply in Supabase SQL editor (Dashboard) as an admin.

-- 1) lessons: allow admins and reviewers to INSERT/UPDATE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lessons'
      AND policyname='Only admins can insert lessons'
  ) THEN
    EXECUTE 'DROP POLICY "Only admins can insert lessons" ON public.lessons';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lessons'
      AND policyname='Only admins can update lessons'
  ) THEN
    EXECUTE 'DROP POLICY "Only admins can update lessons" ON public.lessons';
  END IF;
END $$;

-- Recreate with correct role checks
CREATE POLICY "Admins and reviewers can insert lessons"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin','reviewer')
    )
  );

CREATE POLICY "Admins and reviewers can update lessons"
  ON public.lessons FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin','reviewer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin','reviewer')
    )
  );

-- 2) lesson_versions: allow reviewers to create versions when approving updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lesson_versions'
      AND policyname='Only admins can create versions'
  ) THEN
    EXECUTE 'DROP POLICY "Only admins can create versions" ON public.lesson_versions';
  END IF;
END $$;

CREATE POLICY "Admins and reviewers can create versions"
  ON public.lesson_versions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role IN ('admin','reviewer')
    )
  );

-- Optional: keep existing SELECT policies as-is

-- Validation (read-only):
-- SELECT schemaname, tablename, policyname, cmd, roles FROM pg_policies
--  WHERE schemaname='public' AND tablename IN ('lessons','lesson_versions');

