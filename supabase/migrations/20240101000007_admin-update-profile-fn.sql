-- SECURITY DEFINER function so admins can update any profile,
-- bypassing RLS (which has self-reference issues on the profiles table).
CREATE OR REPLACE FUNCTION admin_update_profile(
  target_user_id UUID,
  new_full_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_role TEXT DEFAULT NULL,
  new_address_line1 TEXT DEFAULT NULL,
  new_address_line2 TEXT DEFAULT NULL,
  new_city TEXT DEFAULT NULL,
  new_postal_code TEXT DEFAULT NULL,
  new_birthday DATE DEFAULT NULL,
  new_center_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update other profiles';
  END IF;

  UPDATE profiles
  SET
    full_name = new_full_name,
    phone = new_phone,
    role = new_role,
    address_line1 = new_address_line1,
    address_line2 = new_address_line2,
    city = new_city,
    postal_code = new_postal_code,
    birthday = new_birthday,
    center_id = new_center_id,
    updated_at = now()
  WHERE id = target_user_id;
END;
$$;
