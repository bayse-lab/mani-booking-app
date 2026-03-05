-- ============================================
-- Profile creation trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Book Class Function
-- ============================================

CREATE OR REPLACE FUNCTION public.fn_book_class(
  p_user_id UUID,
  p_class_instance_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class public.class_instances%ROWTYPE;
  v_existing_booking public.bookings%ROWTYPE;
  v_existing_waitlist public.waitlist_entries%ROWTYPE;
  v_hours_until_start NUMERIC;
BEGIN
  -- Lock the class instance row to prevent race conditions
  SELECT * INTO v_class
  FROM public.class_instances
  WHERE id = p_class_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Class not found');
  END IF;

  -- Check class is still scheduled
  IF v_class.status != 'scheduled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Class is not available');
  END IF;

  -- Check 4-hour cutoff
  v_hours_until_start := EXTRACT(EPOCH FROM (v_class.start_time - now())) / 3600;
  IF v_hours_until_start < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking closed (less than 4 hours before class)');
  END IF;

  -- Check for existing confirmed booking
  SELECT * INTO v_existing_booking
  FROM public.bookings
  WHERE user_id = p_user_id
    AND class_instance_id = p_class_instance_id
    AND status = 'confirmed';

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already booked for this class');
  END IF;

  -- Check for existing waitlist entry
  SELECT * INTO v_existing_waitlist
  FROM public.waitlist_entries
  WHERE user_id = p_user_id
    AND class_instance_id = p_class_instance_id
    AND status = 'waiting';

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already on the waitlist');
  END IF;

  -- Check spots
  IF v_class.spots_remaining > 0 THEN
    -- Book the class
    INSERT INTO public.bookings (user_id, class_instance_id, status)
    VALUES (p_user_id, p_class_instance_id, 'confirmed');

    UPDATE public.class_instances
    SET spots_remaining = spots_remaining - 1,
        updated_at = now()
    WHERE id = p_class_instance_id;

    -- Create confirmation notification
    INSERT INTO public.notifications (user_id, title, body, data)
    VALUES (
      p_user_id,
      'Booking Confirmed',
      'You have been booked into the class.',
      jsonb_build_object(
        'type', 'booking_confirmed',
        'class_instance_id', p_class_instance_id
      )
    );

    RETURN jsonb_build_object('success', true, 'action', 'booked');
  ELSE
    -- Add to waitlist
    INSERT INTO public.waitlist_entries (user_id, class_instance_id, position)
    VALUES (
      p_user_id,
      p_class_instance_id,
      COALESCE(
        (SELECT MAX(position) FROM public.waitlist_entries
         WHERE class_instance_id = p_class_instance_id
           AND status = 'waiting'),
        0
      ) + 1
    );

    RETURN jsonb_build_object(
      'success', true,
      'action', 'waitlisted',
      'position', (SELECT position FROM public.waitlist_entries
                   WHERE user_id = p_user_id
                     AND class_instance_id = p_class_instance_id
                     AND status = 'waiting')
    );
  END IF;
END;
$$;

-- ============================================
-- Cancel Booking Function
-- ============================================

CREATE OR REPLACE FUNCTION public.fn_cancel_booking(
  p_user_id UUID,
  p_booking_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_class public.class_instances%ROWTYPE;
  v_hours_until_start NUMERIC;
  v_minutes_until_start NUMERIC;
  v_cancel_type TEXT;
  v_next_waitlist public.waitlist_entries%ROWTYPE;
  v_promotion_action TEXT := 'none';
BEGIN
  -- Lock the booking row
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status != 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is not active');
  END IF;

  -- Get class details
  SELECT * INTO v_class
  FROM public.class_instances
  WHERE id = v_booking.class_instance_id
  FOR UPDATE;

  v_hours_until_start := EXTRACT(EPOCH FROM (v_class.start_time - now())) / 3600;
  v_minutes_until_start := EXTRACT(EPOCH FROM (v_class.start_time - now())) / 60;

  -- Determine cancellation type
  IF v_hours_until_start >= 4 THEN
    v_cancel_type := 'standard';
  ELSE
    v_cancel_type := 'late';
  END IF;

  -- Cancel the booking
  UPDATE public.bookings
  SET status = CASE WHEN v_cancel_type = 'late' THEN 'late_cancelled' ELSE 'cancelled' END,
      cancelled_at = now(),
      cancellation_type = v_cancel_type,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Free up the spot
  UPDATE public.class_instances
  SET spots_remaining = spots_remaining + 1,
      updated_at = now()
  WHERE id = v_booking.class_instance_id;

  -- Waitlist promotion logic
  IF v_hours_until_start >= 4 THEN
    -- AUTO-PROMOTE: >4 hours before class
    SELECT * INTO v_next_waitlist
    FROM public.waitlist_entries
    WHERE class_instance_id = v_booking.class_instance_id
      AND status = 'waiting'
    ORDER BY position ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      -- Promote them
      UPDATE public.waitlist_entries
      SET status = 'promoted', promoted_at = now(), updated_at = now()
      WHERE id = v_next_waitlist.id;

      -- Create their booking
      INSERT INTO public.bookings (user_id, class_instance_id, status)
      VALUES (v_next_waitlist.user_id, v_booking.class_instance_id, 'confirmed');

      -- Decrement spots again
      UPDATE public.class_instances
      SET spots_remaining = spots_remaining - 1, updated_at = now()
      WHERE id = v_booking.class_instance_id;

      -- Reposition remaining waitlist
      UPDATE public.waitlist_entries
      SET position = position - 1, updated_at = now()
      WHERE class_instance_id = v_booking.class_instance_id
        AND status = 'waiting'
        AND position > v_next_waitlist.position;

      -- Notification for promoted user
      INSERT INTO public.notifications (user_id, title, body, data)
      VALUES (
        v_next_waitlist.user_id,
        'You''re in!',
        'A spot opened up and you''ve been booked into the class.',
        jsonb_build_object(
          'class_instance_id', v_booking.class_instance_id,
          'type', 'waitlist_promoted'
        )
      );

      v_promotion_action := 'auto_promoted';
    END IF;

  ELSIF v_minutes_until_start >= 30 THEN
    -- FCFS MODE: 30min-4h before class
    -- Return flag so the client/edge function can notify all waitlisted users
    v_promotion_action := 'fcfs_notify_all';

  ELSE
    -- <30 minutes before class: too late for notifications
    v_promotion_action := 'none_too_close';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cancellation_type', v_cancel_type,
    'promotion_action', v_promotion_action,
    'class_instance_id', v_booking.class_instance_id
  );
END;
$$;
