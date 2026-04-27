-- =====================================================
-- Migration: 20260428000005_phase_4_complete_review_atomic_grant_service_role.sql
-- =====================================================
-- Description: GRANT EXECUTE on complete_review_atomic to service_role.
-- Pair to the REVOKE in ...000004. See ...000003 header for the full
-- Pattern A (auth-boundary) explanation: the new complete-review edge
-- function is the single auth boundary; it calls the RPC with the
-- service-role key after validating role.

GRANT EXECUTE ON FUNCTION public.complete_review_atomic(uuid, uuid, text, jsonb, text, text) TO service_role;

-- ROLLBACK: REVOKE EXECUTE ON FUNCTION public.complete_review_atomic(uuid, uuid, text, jsonb, text, text) FROM service_role;
