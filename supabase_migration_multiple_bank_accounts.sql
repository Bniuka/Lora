-- =========================================================================
-- Migration: Support for Multiple Bank Accounts for Creators & Learner Bank Tracking
-- =========================================================================

-- 1. Add bank_accounts JSONB column to creator_bank_details table
-- Stores an array of bank account objects with keys:
-- { id, bank_name, account_holder_name, account_number, branch, branch_code, country, extra_note, is_primary }
ALTER TABLE public.creator_bank_details 
ADD COLUMN IF NOT EXISTS bank_accounts jsonb DEFAULT '[]'::jsonb;

-- 2. Add bank_name_used column to enrollments table
-- Records the specific bank account chosen by the learner during bank transfer
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS bank_name_used text;

-- 3. Update existing records: if creator_bank_details has a single bank record,
-- wrap it into the bank_accounts jsonb array so existing creators have zero interruption.
UPDATE public.creator_bank_details
SET bank_accounts = jsonb_build_array(
  jsonb_build_object(
    'id', COALESCE(id::text, gen_random_uuid()::text),
    'bank_name', bank_name,
    'account_holder_name', account_holder_name,
    'account_number', account_number,
    'branch', branch,
    'branch_code', branch_code,
    'country', country,
    'extra_note', extra_note,
    'is_primary', true
  )
)
WHERE (bank_accounts IS NULL OR bank_accounts = '[]'::jsonb)
  AND bank_name IS NOT NULL 
  AND bank_name != '';
