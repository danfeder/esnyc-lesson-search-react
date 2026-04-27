-- =====================================================
-- Migration: 20260428000001_phase_4_helper_jsonb_text_array.sql
-- =====================================================
-- Description: First of two private helper functions used by the Phase 4
-- complete_review_atomic RPC (...000003). One helper per file so the
-- Supabase CLI's statement splitter doesn't choke on multiple dollar-
-- quoted blocks (cf. ...000000 header).
--
-- _phase4_jsonb_text_array(jsonb) → text[]
--   Returns [] for null/scalar-quoting, scalar wrapped in single-element
--   array, or unwraps a JSONB array to a text[]. Used by the approve_new
--   branch of the RPC where "no value supplied" should default to an
--   empty array (matching the existing ReviewDetail.tsx behavior).

-- =====================================================
-- CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION public._phase4_jsonb_text_array(p_value jsonb)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' THEN
    RETURN ARRAY[]::text[];
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    RETURN ARRAY(SELECT jsonb_array_elements_text(p_value));
  ELSE
    -- Scalar value (string/number/bool) — wrap.
    RETURN ARRAY[trim(both '"' from p_value::text)];
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._phase4_jsonb_text_array(jsonb)
  FROM PUBLIC, anon, authenticated;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP FUNCTION IF EXISTS public._phase4_jsonb_text_array(jsonb);
