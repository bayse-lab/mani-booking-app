-- App-wide settings as key-value pairs
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default pricing values
INSERT INTO public.app_settings (key, value, description) VALUES
  ('late_cancellation_fee_dkk', '0', 'Fee in DKK for cancellations within 4 hours of class start'),
  ('no_show_fee_dkk', '0', 'Fee in DKK when user does not show up for a booked class')
ON CONFLICT (key) DO NOTHING;

-- RLS: admins can read and write; everyone else can read
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage app_settings"
  ON public.app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
