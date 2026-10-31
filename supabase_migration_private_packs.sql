-- =========================================================================
-- Migration: Add Private & Unlisted visibility modes + Secret Invite Token
-- =========================================================================

-- 1. Add visibility ('public' | 'private' | 'unlisted') to session_packs
ALTER TABLE public.session_packs
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';

-- 2. Add invite_token for unlocking private / unlisted packs via creator link
ALTER TABLE public.session_packs
ADD COLUMN IF NOT EXISTS invite_token text DEFAULT NULL;

-- 3. Backfill existing rows that have NULL visibility
UPDATE public.session_packs
SET visibility = 'public'
WHERE visibility IS NULL;
