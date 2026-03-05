-- ============================================
-- MANI Booking App - Multi-Center + User Fields
-- ============================================

-- Centers table
CREATE TABLE public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add center_id to class_instances
ALTER TABLE public.class_instances
  ADD COLUMN center_id UUID REFERENCES centers(id);

CREATE INDEX idx_class_instances_center ON class_instances(center_id);

-- Add user profile fields: address + birthday
ALTER TABLE public.profiles
  ADD COLUMN address_line1 TEXT,
  ADD COLUMN address_line2 TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN postal_code TEXT,
  ADD COLUMN birthday DATE;

-- RLS for centers: anyone authenticated can read active centers, admins can manage
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active centers"
  ON centers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage centers"
  ON centers FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed 2 centers
INSERT INTO public.centers (name, address, city, postal_code, phone, email) VALUES
  ('Maní Forme Aarhus', 'Jægergårdsgade 120', 'Aarhus C', '8000', '+45 12 34 56 78', 'aarhus@mani.studio'),
  ('Maní Forme København', 'Vesterbrogade 45', 'København V', '1620', '+45 87 65 43 21', 'kobenhavn@mani.studio');

-- Assign existing class instances to the first center (Aarhus)
UPDATE public.class_instances
SET center_id = (SELECT id FROM public.centers WHERE city = 'Aarhus C' LIMIT 1)
WHERE center_id IS NULL;
