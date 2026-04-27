-- =====================================================
-- Migration: 20260428000002_phase_4_helper_jsonb_text_array_or_null.sql
-- =====================================================
-- Description: Second of two private helper functions used by the Phase 4
-- complete_review_atomic RPC (...000003). Sister to ...000001.
--
-- _phase4_jsonb_text_array_or_null(jsonb) → text[]
--   Returns NULL (not []) when the input is absent/null/empty-array.
--   Used by the approve_update branch of the RPC so a COALESCE chain
--   can fall through to the existing column value when the reviewer
--   didn't supply anything for that field. Returning [] instead would
--   clobber the existing array, which is the behavior approve_new wants
--   but approve_update doesn't.

-- =====================================================
-- CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION public._phase4_jsonb_text_array_or_null(p_value jsonb)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) = 'null' THEN
    RETURN NULL;
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    IF jsonb_array_length(p_value) = 0 THEN
      RETURN NULL;
    END IF;
    RETURN ARRAY(SELECT jsonb_array_elements_text(p_value));
  ELSE
    RETURN ARRAY[trim(both '"' from p_value::text)];
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._phase4_jsonb_text_array_or_null(jsonb)
  FROM PUBLIC, anon, authenticated;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP FUNCTION IF EXISTS public._phase4_jsonb_text_array_or_null(jsonb);
