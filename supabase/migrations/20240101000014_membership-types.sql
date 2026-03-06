-- Migration: Membership Types

CREATE TABLE IF NOT EXISTS membership_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_dkk NUMERIC(10, 2),
  max_bookings_ahead INTEGER, -- NULL = unlimited
  allowed_class_times JSONB, -- NULL = all times, or ["06:00-09:00", "17:00-21:00"]
  required_fields JSONB DEFAULT '[]'::jsonb, -- ["phone", "birthday", "address_line1"]
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_months')),
  discount_value NUMERIC(10, 2),
  discount_label TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add membership_type_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_type_id UUID REFERENCES membership_types(id);

-- RLS policies
ALTER TABLE membership_types ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active membership types
CREATE POLICY "Authenticated users can view active membership types"
  ON membership_types
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage all membership types (via fn check)
CREATE POLICY "Admins can manage membership types"
  ON membership_types
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
