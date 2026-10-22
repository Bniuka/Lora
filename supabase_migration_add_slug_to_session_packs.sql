-- Migration: Add custom slug column to session_packs for short, clean URLs
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/gpxnalcfagzmewulvjcf/sql

ALTER TABLE public.session_packs ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_packs_slug ON public.session_packs(slug);

-- Backfill existing session_packs with clean, human-readable slugs
-- Converts "Python Masterclass" -> "python-masterclass"
UPDATE public.session_packs
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      COALESCE(NULLIF(TRIM(title), ''), 'pack'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  )
)
WHERE slug IS NULL;

-- In case there were duplicate titles, append a short unique suffix to duplicates
DO $$
DECLARE
  rec RECORD;
  i INT;
BEGIN
  FOR rec IN (
    SELECT slug, COUNT(*) 
    FROM public.session_packs 
    WHERE slug IS NOT NULL 
    GROUP BY slug 
    HAVING COUNT(*) > 1
  ) LOOP
    i := 1;
    FOR rec IN (SELECT id FROM public.session_packs WHERE slug = rec.slug ORDER BY created_at) LOOP
      IF i > 1 THEN
        UPDATE public.session_packs 
        SET slug = rec.slug || '-' || i 
        WHERE id = rec.id;
      END IF;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;
