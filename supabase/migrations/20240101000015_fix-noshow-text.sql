-- Fix no-show notification text: replace unicode escapes with proper Danish characters
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
