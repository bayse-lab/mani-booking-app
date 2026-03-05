-- 00005_centers-expansion.sql
-- Adds: reformer_count on centers, center_id on profiles, instructor_centers junction table.
-- Updates: handle_new_user trigger to accept center_id from signup metadata.

-- 1. Add reformer_count to centers
ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS reformer_count INTEGER NOT NULL DEFAULT 0;

-- 2. Add center_id to profiles (nullable for existing users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS center_id UUID REFERENCES public.centers(id);

CREATE INDEX IF NOT EXISTS idx_profiles_center_id ON public.profiles(center_id);

-- 3. Create instructor_centers junction table
CREATE TABLE IF NOT EXISTS public.instructor_centers (
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  center_id     UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (instructor_id, center_id)
);

ALTER TABLE public.instructor_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view instructor-center links"
  ON public.instructor_centers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage instructor-center links"
  ON public.instructor_centers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Update handle_new_user trigger to accept center_id from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, center_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'center_id' IS NOT NULL
       AND NEW.raw_user_meta_data->>'center_id' != ''
      THEN (NEW.raw_user_meta_data->>'center_id')::UUID
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

-- 5. Seed reformer counts for existing centers
UPDATE public.centers SET reformer_count = 12 WHERE name = 'Maní Forme Aarhus';
UPDATE public.centers SET reformer_count = 10 WHERE name = 'Maní Forme København';

-- 6. Allow profiles to update their own center_id
-- (the existing "Users can update own profile" policy should already cover this
--  since center_id is just another column on profiles)
