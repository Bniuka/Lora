-- =========================================================================
-- Migration: Support for Pack Promo Codes with Attempt / Usage Limits
-- =========================================================================

-- 1. Create pack_promo_codes table
CREATE TABLE IF NOT EXISTS public.pack_promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id uuid REFERENCES public.session_packs(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    code text NOT NULL,
    discount_type text DEFAULT 'free',
    max_uses integer NOT NULL DEFAULT 1,
    used_count integer NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    UNIQUE(pack_id, code)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.pack_promo_codes ENABLE ROW LEVEL SECURITY;

-- 3. Public read policy: Anyone can check/validate a promo code for redemption
CREATE POLICY "Public promo codes are viewable for redemption" ON public.pack_promo_codes
    FOR SELECT USING (true);

-- 4. Creators can insert promo codes for their own packs
CREATE POLICY "Creators can insert promo codes" ON public.pack_promo_codes
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 5. Creators can update promo codes, and redemption can update used_count
CREATE POLICY "Creators and redemption update policy" ON public.pack_promo_codes
    FOR UPDATE USING (true);

-- 6. Creators can delete their own promo codes
CREATE POLICY "Creators can delete promo codes" ON public.pack_promo_codes
    FOR DELETE USING (auth.uid() = creator_id);

-- 7. Add promo_code_used column to enrollments table
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS promo_code_used text;
