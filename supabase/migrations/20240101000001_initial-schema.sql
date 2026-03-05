-- ============================================
-- MANI Booking App - Initial Database Schema
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  expo_push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);

-- Class definitions (templates)
CREATE TABLE public.class_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  what TEXT,         -- "What is this class?"
  who TEXT,          -- "Who is it for?"
  experience TEXT,   -- "What experience level?"
  bring TEXT,        -- "What to bring?"
  wear TEXT,         -- "What to wear?"
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  capacity INTEGER NOT NULL DEFAULT 12,
  intensity INTEGER NOT NULL DEFAULT 3 CHECK (intensity >= 1 AND intensity <= 5),
  category TEXT,     -- e.g., 'reformer', 'mat', 'barre'
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Class instances (scheduled occurrences)
CREATE TABLE public.class_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_definition_id UUID NOT NULL REFERENCES class_definitions(id) ON DELETE CASCADE,
  instructor_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  spots_remaining INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_time CHECK (end_time > start_time),
  CONSTRAINT valid_spots CHECK (spots_remaining >= 0 AND spots_remaining <= capacity)
);

CREATE INDEX idx_class_instances_start_time ON class_instances(start_time);
CREATE INDEX idx_class_instances_status ON class_instances(status);
CREATE INDEX idx_class_instances_definition ON class_instances(class_definition_id);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'late_cancelled', 'no_show', 'completed')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  cancellation_type TEXT CHECK (cancellation_type IN ('standard', 'late')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: only one confirmed booking per user per class
CREATE UNIQUE INDEX idx_unique_active_booking
  ON bookings(user_id, class_instance_id)
  WHERE status = 'confirmed';

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_class_instance ON bookings(class_instance_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Waitlist entries
CREATE TABLE public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'offered', 'promoted', 'expired', 'removed')),
  offered_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one active waitlist entry per user per class
CREATE UNIQUE INDEX idx_unique_waitlist_entry
  ON waitlist_entries(user_id, class_instance_id)
  WHERE status = 'waiting';

CREATE INDEX idx_waitlist_class ON waitlist_entries(class_instance_id);
CREATE INDEX idx_waitlist_user ON waitlist_entries(user_id);
CREATE INDEX idx_waitlist_position ON waitlist_entries(class_instance_id, position)
  WHERE status = 'waiting';

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unsent ON notifications(is_sent) WHERE is_sent = false;
