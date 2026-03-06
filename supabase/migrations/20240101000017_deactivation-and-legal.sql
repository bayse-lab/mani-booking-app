-- Add deactivation request column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivation_requested_at TIMESTAMPTZ DEFAULT NULL;

-- Seed legal text settings (privacy policy + terms of service)
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('privacy_policy', '# Privacy Policy

**Maní** respects your privacy. This policy describes how we collect, use, and protect your personal data.

## Data We Collect
- **Account information**: name, email, phone number, birthday, and address
- **Booking data**: class reservations, cancellations, and attendance history
- **Device information**: push notification tokens for sending class reminders

## How We Use Your Data
- To manage your class bookings and memberships
- To send booking confirmations, reminders, and cancellation notices
- To communicate important updates about your studio

## Data Storage
Your data is stored securely on Supabase (hosted in the EU). We do not sell or share your personal data with third parties.

## Your Rights
You can update your personal information at any time in the app. You can request account deletion from your profile settings — your data will be permanently removed after a notice period.

## Contact
For questions about your data, contact your Maní studio directly.

*Last updated: March 2026*', 'Privacy policy text (Markdown)'),

  ('terms_of_service', '# Terms of Service

Welcome to **Maní**. By using this app, you agree to the following terms.

## Account
- You must provide accurate information when creating an account
- You are responsible for keeping your login credentials secure
- One account per person

## Bookings
- Class bookings are subject to availability
- Cancellations within 4 hours of class start may incur a fee
- No-shows may incur a fee
- Your studio reserves the right to cancel classes and will notify you

## Membership
- Account deletion can be requested from your profile
- After requesting deletion, your subscription continues until the end of the following month
- After the notice period, your account and data are permanently deleted

## Acceptable Use
- Do not misuse the app or attempt to disrupt its services
- Do not create accounts for others without their consent

## Changes
We may update these terms. Continued use of the app means you accept the updated terms.

## Contact
For questions, contact your Maní studio directly.

*Last updated: March 2026*', 'Terms of service text (Markdown)')

ON CONFLICT (key) DO NOTHING;
