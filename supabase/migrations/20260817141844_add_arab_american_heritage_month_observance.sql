-- =====================================================
-- Migration: add Arab American Heritage Month observance
-- =====================================================
-- Description:
--   Expand the closed lessons.observances_holidays vocabulary from 16 to 17
--   values. This migration changes validation only; it does not tag lessons.
--
-- Locking:
--   Replacing a CHECK constraint briefly locks public.lessons. Fail quickly
--   instead of waiting behind application traffic.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS valid_observances_holidays;

ALTER TABLE public.lessons
  ADD CONSTRAINT valid_observances_holidays
  -- SOURCE: src/types/generated/enums.json["observances_holidays"]
  CHECK (
    observances_holidays IS NULL
    OR observances_holidays <@ ARRAY[
      'AAPI Heritage Month',
      'Arab American Heritage Month',
      'Black History Month',
      'Hispanic/Latinx Heritage Month',
      'Indigenous Peoples'' Month',
      'Women''s History Month',
      'Pride',
      'Earth Month',
      'Thanksgiving',
      'Lunar New Year',
      'New Year',
      'Ramadan',
      'Eid',
      'Juneteenth',
      'School Food Hero Day',
      'Beginning of year',
      'End of year celebrations'
    ]::text[]
  ) NOT VALID;

ALTER TABLE public.lessons
  VALIDATE CONSTRAINT valid_observances_holidays;

COMMIT;

-- =====================================================
-- ROLLBACK (comments only)
-- =====================================================
-- Preconditions: this contracts the allowed vocabulary. Before rollback,
-- assert that no row carries 'Arab American Heritage Month'. After the later
-- allowlisted data change, remove only that tag from the approved IDs first.
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- ALTER TABLE public.lessons
--   DROP CONSTRAINT IF EXISTS valid_observances_holidays;
-- ALTER TABLE public.lessons
--   ADD CONSTRAINT valid_observances_holidays
--   CHECK (
--     observances_holidays IS NULL
--     OR observances_holidays <@ ARRAY[
--       'AAPI Heritage Month',
--       'Black History Month',
--       'Hispanic/Latinx Heritage Month',
--       'Indigenous Peoples'' Month',
--       'Women''s History Month',
--       'Pride',
--       'Earth Month',
--       'Thanksgiving',
--       'Lunar New Year',
--       'New Year',
--       'Ramadan',
--       'Eid',
--       'Juneteenth',
--       'School Food Hero Day',
--       'Beginning of year',
--       'End of year celebrations'
--     ]::text[]
--   ) NOT VALID;
-- ALTER TABLE public.lessons
--   VALIDATE CONSTRAINT valid_observances_holidays;
-- COMMIT;
