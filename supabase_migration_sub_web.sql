-- ============================================================================
-- LoraSpace Sub-Web ("Own Academy Website") & Custom Domain Migration
-- Run this script in your Supabase SQL Editor
-- ============================================================================

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS has_sub_web BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sub_web_slug TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS sub_web_config JSONB DEFAULT '{}'::jsonb;

-- Create unique indexes for fast subdomain and custom domain lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_profiles_sub_web_slug
  ON public.creator_profiles (LOWER(sub_web_slug))
  WHERE sub_web_slug IS NOT NULL AND sub_web_slug <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_profiles_custom_domain
  ON public.creator_profiles (LOWER(custom_domain))
  WHERE custom_domain IS NOT NULL AND custom_domain <> '';
