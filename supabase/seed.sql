-- ============================================
-- Seed Data for MANI Booking App
-- ============================================

-- Class Definitions
INSERT INTO public.class_definitions (id, name, description, what, who, experience, bring, wear, duration_minutes, capacity, intensity, category) VALUES
(
  'a1b2c3d4-0001-4000-8000-000000000001',
  'MANI REFORMER FIRE',
  'An intense full-body reformer workout that will challenge your strength and endurance.',
  'A high-intensity reformer class focusing on strength, endurance, and full-body conditioning. Expect dynamic movements and challenging sequences.',
  'Anyone looking for an intense workout. Perfect for those who want to push their limits.',
  'Some reformer experience recommended. You should be comfortable with basic reformer movements.',
  'Grip socks (required), towel, water bottle',
  'Comfortable, form-fitting workout clothes',
  50, 12, 4, 'reformer'
),
(
  'a1b2c3d4-0002-4000-8000-000000000002',
  'MANI REFORMER FLOW',
  'A flowing reformer class that builds strength through fluid movement sequences.',
  'A balanced reformer class combining strength work with flowing transitions. Focus on control, breath, and mindful movement.',
  'All levels welcome. Great for beginners and experienced practitioners alike.',
  'No prior experience needed. Instructor will guide you through all movements.',
  'Grip socks (required), towel, water bottle',
  'Comfortable, form-fitting workout clothes',
  50, 12, 2, 'reformer'
),
(
  'a1b2c3d4-0003-4000-8000-000000000003',
  'MANI MAT PILATES',
  'Classic mat Pilates focusing on core strength, flexibility, and body awareness.',
  'A traditional mat Pilates class using your bodyweight and small props. Emphasis on core engagement and proper form.',
  'All levels. Perfect entry point for Pilates beginners.',
  'No experience needed.',
  'Yoga mat (provided), towel, water bottle',
  'Comfortable workout clothes',
  45, 16, 2, 'mat'
),
(
  'a1b2c3d4-0004-4000-8000-000000000004',
  'MANI REFORMER SCULPT',
  'A sculpting reformer class targeting specific muscle groups for toning and definition.',
  'Targeted reformer work focusing on arms, glutes, and core. Each class has a different focus area for balanced body sculpting.',
  'All levels. Each exercise has modifications for different fitness levels.',
  'Basic reformer knowledge helpful but not required.',
  'Grip socks (required), towel, water bottle',
  'Comfortable, form-fitting workout clothes',
  50, 12, 3, 'reformer'
),
(
  'a1b2c3d4-0005-4000-8000-000000000005',
  'MANI STRETCH & RESTORE',
  'A gentle stretching and restoration class to improve flexibility and recovery.',
  'A slow-paced class combining deep stretching, myofascial release, and gentle movements. Perfect for active recovery.',
  'Everyone. Especially great after intense workout days.',
  'No experience needed.',
  'Yoga mat (provided), towel',
  'Comfortable, loose-fitting clothes',
  40, 16, 1, 'mat'
);

-- Class Instances for the next 7 days
-- Using a function to generate dates dynamically
DO $$
DECLARE
  v_date DATE;
  v_day_of_week INTEGER;
BEGIN
  FOR i IN 0..6 LOOP
    v_date := CURRENT_DATE + i;
    v_day_of_week := EXTRACT(DOW FROM v_date);

    -- Skip Sunday (0)
    IF v_day_of_week = 0 THEN
      CONTINUE;
    END IF;

    -- Morning classes (Mon-Sat)
    INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
    VALUES (
      'a1b2c3d4-0002-4000-8000-000000000002',
      'Sarah',
      v_date + TIME '07:00',
      v_date + TIME '07:50',
      12, 12
    );

    INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
    VALUES (
      'a1b2c3d4-0003-4000-8000-000000000003',
      'Emma',
      v_date + TIME '08:00',
      v_date + TIME '08:45',
      16, 16
    );

    -- Midday (Mon-Fri)
    IF v_day_of_week BETWEEN 1 AND 5 THEN
      INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
      VALUES (
        'a1b2c3d4-0004-4000-8000-000000000004',
        'Louise',
        v_date + TIME '12:00',
        v_date + TIME '12:50',
        12, 12
      );
    END IF;

    -- Afternoon/Evening (Mon-Thu)
    IF v_day_of_week BETWEEN 1 AND 4 THEN
      INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
      VALUES (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Sarah',
        v_date + TIME '17:00',
        v_date + TIME '17:50',
        12, 12
      );

      INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
      VALUES (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Emma',
        v_date + TIME '18:00',
        v_date + TIME '18:50',
        12, 12
      );

      INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
      VALUES (
        'a1b2c3d4-0002-4000-8000-000000000002',
        'Louise',
        v_date + TIME '19:00',
        v_date + TIME '19:50',
        12, 12
      );
    END IF;

    -- Friday evening stretch
    IF v_day_of_week = 5 THEN
      INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
      VALUES (
        'a1b2c3d4-0005-4000-8000-000000000005',
        'Emma',
        v_date + TIME '17:00',
        v_date + TIME '17:40',
        16, 16
      );
    END IF;

    -- Saturday special
    IF v_day_of_week = 6 THEN
      INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
      VALUES (
        'a1b2c3d4-0001-4000-8000-000000000001',
        'Sarah',
        v_date + TIME '09:00',
        v_date + TIME '09:50',
        12, 12
      );

      INSERT INTO public.class_instances (class_definition_id, instructor_name, start_time, end_time, capacity, spots_remaining)
      VALUES (
        'a1b2c3d4-0005-4000-8000-000000000005',
        'Louise',
        v_date + TIME '10:00',
        v_date + TIME '10:40',
        16, 16
      );
    END IF;
  END LOOP;
END $$;
