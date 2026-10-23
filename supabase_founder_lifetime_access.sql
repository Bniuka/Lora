-- =========================================================================
-- Grant Permanent Lifetime VIP Access to Founder
-- =========================================================================

UPDATE public.creator_profiles
SET subscription_status = 'active',
    next_billing_date = NULL,
    trial_ends_at = NULL
WHERE id IN (
  SELECT id FROM public.profiles WHERE LOWER(email) = 'binukadin2009@gmail.com'
);
