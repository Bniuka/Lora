-- Add subscription-related columns to creator_profiles table
-- These columns support the creator subscription/trial system

ALTER TABLE creator_profiles 
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

-- Add a comment for documentation
COMMENT ON COLUMN creator_profiles.subscription_status IS 'Creator subscription status: trial, active, expired, cancelled';
COMMENT ON COLUMN creator_profiles.trial_started_at IS 'Timestamp when the 30-day free trial began';
COMMENT ON COLUMN creator_profiles.trial_ends_at IS 'Timestamp when the 30-day free trial expires';
COMMENT ON COLUMN creator_profiles.next_billing_date IS 'Next billing date for active subscriptions';
