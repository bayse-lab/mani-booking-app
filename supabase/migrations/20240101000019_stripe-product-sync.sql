-- Add stripe_product_id to membership_types for tracking the Stripe Product
ALTER TABLE membership_types ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
