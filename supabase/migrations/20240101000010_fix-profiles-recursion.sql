-- ============================================
-- Fix infinite recursion in profiles RLS policy
-- ============================================
-- The "Instructors can view attendee profiles" policy from migration 009
-- causes infinite recursion because it queries bookings → which has policies
-- querying profiles → which queries bookings → loop.
--
-- Fix: Drop the problematic policy and use a SECURITY DEFINER function
-- to fetch attendees instead. The ClassDetail page will call this function.

-- Drop the recursive policy
DROP POLICY IF EXISTS "Instructors can view attendee profiles" ON profiles;

-- Create a SECURITY DEFINER function that returns attendee data for a class
-- This bypasses RLS entirely, with its own authorization check inside.
CREATE OR REPLACE FUNCTION fn_get_class_attendees(
  p_class_instance_id UUID
)
RETURNS TABLE (
  booking_id UUID,
  user_id UUID,
  status TEXT,
  booked_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  full_name TEXT,
  email TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller profiles%ROWTYPE;
  v_class class_instances%ROWTYPE;
BEGIN
  -- Get caller profile
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Get class instance
  SELECT * INTO v_class FROM class_instances WHERE id = p_class_instance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  -- Authorization: admin OR instructor of this class
  IF v_caller.role = 'admin' THEN
    NULL; -- OK
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN
    NULL; -- OK
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Return attendees with profile data
  RETURN QUERY
  SELECT
    b.id AS booking_id,
    b.user_id,
    b.status::TEXT,
    b.booked_at,
    b.checked_in_at,
    p.full_name,
    p.email,
    p.phone
  FROM bookings b
  JOIN profiles p ON p.id = b.user_id
  WHERE b.class_instance_id = p_class_instance_id
    AND b.status = 'confirmed'
  ORDER BY b.booked_at;
END;
$$;

-- Also create a function for waitlist data
CREATE OR REPLACE FUNCTION fn_get_class_waitlist(
  p_class_instance_id UUID
)
RETURNS TABLE (
  waitlist_id UUID,
  user_id UUID,
  "position" INT,
  status TEXT,
  full_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller profiles%ROWTYPE;
  v_class class_instances%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_class FROM class_instances WHERE id = p_class_instance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  IF v_caller.role = 'admin' THEN
    NULL;
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    w.id AS waitlist_id,
    w.user_id,
    w.position,
    w.status::TEXT,
    p.full_name,
    p.email
  FROM waitlist_entries w
  JOIN profiles p ON p.id = w.user_id
  WHERE w.class_instance_id = p_class_instance_id
    AND w.status = 'waiting'
  ORDER BY w.position;
END;
$$;
