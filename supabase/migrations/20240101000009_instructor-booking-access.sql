-- ============================================
-- Instructor booking access + check-in functions
-- ============================================
-- Fixes: bookings not visible in admin, instructors can't check users in.
-- Root cause: missing RLS SELECT/UPDATE policies on bookings for instructors,
-- missing UPDATE policies for admins, and direct .update() calls that fail silently.

-- 1. Instructors can view bookings for classes they teach
CREATE POLICY "Instructors can view bookings for their classes"
  ON bookings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM class_instances ci
      JOIN profiles p ON p.id = auth.uid()
      WHERE ci.id = bookings.class_instance_id
        AND p.role = 'instructor'
        AND ci.instructor_name = p.full_name
    )
  );

-- 2. Instructors can view attendee profiles (users booked into their classes)
CREATE POLICY "Instructors can view attendee profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM bookings b
      JOIN class_instances ci ON ci.id = b.class_instance_id
      WHERE b.user_id = profiles.id
        AND ci.instructor_name = (
          SELECT full_name FROM profiles WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'instructor'
        )
    )
  );

-- 3. Instructors can view waitlist for their classes
CREATE POLICY "Instructors can view waitlist for their classes"
  ON waitlist_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM class_instances ci
      JOIN profiles p ON p.id = auth.uid()
      WHERE ci.id = waitlist_entries.class_instance_id
        AND p.role = 'instructor'
        AND ci.instructor_name = p.full_name
    )
  );

-- 4. Admins can update any booking (check-in, no-show)
CREATE POLICY "Admins can update all bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Instructors can update bookings for classes they teach
CREATE POLICY "Instructors can update bookings for their classes"
  ON bookings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM class_instances ci
      JOIN profiles p ON p.id = auth.uid()
      WHERE ci.id = bookings.class_instance_id
        AND p.role = 'instructor'
        AND ci.instructor_name = p.full_name
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM class_instances ci
      JOIN profiles p ON p.id = auth.uid()
      WHERE ci.id = bookings.class_instance_id
        AND p.role = 'instructor'
        AND ci.instructor_name = p.full_name
    )
  );

-- 6. SECURITY DEFINER function: check in / undo check-in
CREATE OR REPLACE FUNCTION fn_check_in_booking(
  p_booking_id UUID,
  p_undo BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_class class_instances%ROWTYPE;
  v_caller profiles%ROWTYPE;
BEGIN
  -- Get caller profile
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Get the booking
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Get the class instance
  SELECT * INTO v_class FROM class_instances WHERE id = v_booking.class_instance_id;

  -- Authorization: admin OR instructor of this class
  IF v_caller.role = 'admin' THEN
    NULL; -- OK
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN
    NULL; -- OK
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Toggle check-in
  UPDATE bookings
  SET checked_in_at = CASE WHEN p_undo THEN NULL ELSE now() END,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. SECURITY DEFINER function: mark no-show
CREATE OR REPLACE FUNCTION fn_mark_no_show(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_class class_instances%ROWTYPE;
  v_caller profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  SELECT * INTO v_class FROM class_instances WHERE id = v_booking.class_instance_id;

  IF v_caller.role = 'admin' THEN
    NULL;
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN
    NULL;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE bookings
  SET status = 'no_show',
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
