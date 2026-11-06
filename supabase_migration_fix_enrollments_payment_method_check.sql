-- =========================================================================
-- Migration: Fix enrollments_payment_method_used_check Constraint
-- Allows 100% Free enrollments, Promo Codes, Multi-Bank tags, and links
-- =========================================================================

-- 1. Drop the restrictive check constraint on enrollments table.
--    The original constraint restricted payment_method_used to ('link', 'bank'),
--    causing free courses and promo codes to fail with:
--    new row for relation "enrollments" violates check constraint "enrollments_payment_method_used_check"
ALTER TABLE public.enrollments 
DROP CONSTRAINT IF EXISTS enrollments_payment_method_used_check;

-- 2. Optional: If your PostgreSQL schema requires keeping a check constraint,
--    you can uncomment and run the block below to allow all modern values:
/*
ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_payment_method_used_check 
CHECK (
  payment_method_used IS NULL 
  OR payment_method_used IN ('free', 'link', 'bank', 'manual') 
  OR payment_method_used LIKE 'promo:%' 
  OR payment_method_used LIKE 'bank:%'
);
*/

-- 3. Ensure index exists on learner_id & pack_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_enrollments_learner_pack 
ON public.enrollments(learner_id, pack_id);
