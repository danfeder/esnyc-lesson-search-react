-- =====================================================
-- Migration: 20260209140000_cleanup_search_triggers.sql
-- =====================================================
-- Description: Remove duplicate search vector triggers on lessons table.
--   Three triggers fire update_lesson_search_vector() / update_search_vector()
--   on INSERT/UPDATE, causing the function to run 2-3x per operation.
--   Keep only the column-specific trigger (update_lesson_search_vector_trigger)
--   which fires on relevant column changes.

-- =====================================================
-- CHANGES
-- =====================================================

-- Drop the two redundant triggers that fire on ALL INSERT/UPDATE
-- These are superseded by update_lesson_search_vector_trigger which is column-specific
DROP TRIGGER IF EXISTS "trigger_update_lesson_search_vector" ON "public"."lessons";
DROP TRIGGER IF EXISTS "update_lessons_search_vector" ON "public"."lessons";

-- Also drop the obsolete update_search_vector() function that was used by
-- update_lessons_search_vector trigger (uses metadata JSON instead of base columns)
DROP FUNCTION IF EXISTS "public"."update_search_vector"();

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- CREATE OR REPLACE TRIGGER "trigger_update_lesson_search_vector"
--   BEFORE INSERT OR UPDATE ON "public"."lessons"
--   FOR EACH ROW EXECUTE FUNCTION "public"."update_lesson_search_vector"();
--
-- CREATE OR REPLACE TRIGGER "update_lessons_search_vector"
--   BEFORE INSERT OR UPDATE ON "public"."lessons"
--   FOR EACH ROW EXECUTE FUNCTION "public"."update_search_vector"();
