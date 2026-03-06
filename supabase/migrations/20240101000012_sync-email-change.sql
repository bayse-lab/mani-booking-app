-- Migration: Sync email changes from auth.users to profiles
-- When a user changes their email via supabase.auth.updateUser({ email }),
-- this trigger keeps profiles.email in sync.

CREATE OR REPLACE FUNCTION public.fn_sync_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE profiles
    SET email = NEW.email,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER trg_sync_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_email_change();
