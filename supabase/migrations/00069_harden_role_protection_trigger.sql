-- ====================================================================
-- JOHN STAYTE SERVICES - STRICT PROFILE ROLE PROTECTION TRIGGER
-- Migration: 00069_harden_role_protection_trigger.sql
-- ====================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role is being modified
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only active admin can change role
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Role modification is restricted to Administrators.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();
