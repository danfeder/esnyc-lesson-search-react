-- =====================================================
-- Migration: 20260428000004_phase_4_complete_review_atomic_grants.sql
-- =====================================================
-- Description: REVOKE EXECUTE on complete_review_atomic from PUBLIC and
-- the user-facing roles. The matching GRANT to service_role lives in
-- ...000005, COMMENT in ...000006. The split is forced by a Supabase CLI
-- splitter quirk where multiple non-CREATE/ALTER statements in one file
-- get bundled into a single Parse message that Postgres rejects.

REVOKE EXECUTE ON FUNCTION public.complete_review_atomic(uuid, uuid, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;

-- ROLLBACK: GRANT EXECUTE ON FUNCTION public.complete_review_atomic(uuid, uuid, text, jsonb, text, text) TO PUBLIC, anon, authenticated;
