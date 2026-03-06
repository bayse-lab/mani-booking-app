-- ============================================
-- No-show enhancements: visibility, revert, push notifications
-- ============================================

-- 1. Update fn_get_class_attendees to include no-show bookings
--    (previously only returned 'confirmed')
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
  SELECT * INTO v_caller FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  SELECT * INTO v_class FROM class_instances WHERE id = p_class_instance_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class not found'; END IF;

  IF v_caller.role = 'admin' THEN NULL;
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN NULL;
  ELSE RAISE EXCEPTION 'Not authorized';
  END IF;

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
    AND b.status IN ('confirmed', 'no_show')
  ORDER BY b.status ASC, b.booked_at;
END;
$$;

-- 2. Update fn_check_in_booking to insert notification on check-in
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
  v_class_name TEXT;
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

  IF v_caller.role = 'admin' THEN NULL;
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN NULL;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE bookings
  SET checked_in_at = CASE WHEN p_undo THEN NULL ELSE now() END,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Send push notification on check-in (not on undo)
  IF NOT p_undo THEN
    SELECT cd.name INTO v_class_name
    FROM class_definitions cd
    WHERE cd.id = v_class.class_definition_id;

    INSERT INTO notifications (user_id, title, body, data)
    VALUES (
      v_booking.user_id,
      'Tjekket ind',
      'Du er nu tjekket ind til ' || COALESCE(v_class_name, 'dit hold') || '.',
      jsonb_build_object(
        'type', 'check_in',
        'class_instance_id', v_booking.class_instance_id,
        'booking_id', p_booking_id
      )
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Update fn_mark_no_show to insert notification
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
  v_class_name TEXT;
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

  IF v_caller.role = 'admin' THEN NULL;
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN NULL;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE bookings
  SET status = 'no_show',
      updated_at = now()
  WHERE id = p_booking_id;

  -- Send push notification for no-show
  SELECT cd.name INTO v_class_name
  FROM class_definitions cd
  WHERE cd.id = v_class.class_definition_id;

  INSERT INTO notifications (user_id, title, body, data)
  VALUES (
    v_booking.user_id,
    'No-show',
    'Du er markeret som no-show for ' || COALESCE(v_class_name, 'dit hold') || '. En no-show afgift kan blive tilføjet din næste faktura.',
    jsonb_build_object(
      'type', 'no_show',
      'class_instance_id', v_booking.class_instance_id,
      'booking_id', p_booking_id
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Create fn_revert_no_show
CREATE OR REPLACE FUNCTION fn_revert_no_show(
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

  IF v_booking.status != 'no_show' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is not marked as no-show');
  END IF;

  SELECT * INTO v_class FROM class_instances WHERE id = v_booking.class_instance_id;

  IF v_caller.role = 'admin' THEN NULL;
  ELSIF v_caller.role = 'instructor'
    AND v_class.instructor_name = v_caller.full_name THEN NULL;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE bookings
  SET status = 'confirmed',
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
