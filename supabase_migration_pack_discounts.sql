-- =========================================================================
-- Migration: Add percentage / fixed discount & expiry date to promo codes
-- =========================================================================

-- 1. Add discount_value and expires_at to pack_promo_codes
ALTER TABLE public.pack_promo_codes
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;

ALTER TABLE public.pack_promo_codes
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;

-- 2. Add amount_paid and promo_code_used to enrollments table if not exists
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS promo_code_used text;

ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT NULL;
