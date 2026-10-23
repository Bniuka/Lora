-- =========================================================================
-- Migration: Support for 100% Free Courses, YouTube Live, & Upsell Links
-- =========================================================================

-- 1. Add youtube_live_link to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS youtube_live_link text;

-- 2. Add optional course upsell columns to session_packs table
ALTER TABLE public.session_packs 
ADD COLUMN IF NOT EXISTS upsell_title text,
ADD COLUMN IF NOT EXISTS upsell_link text;
