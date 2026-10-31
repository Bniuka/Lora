-- =========================================================================
-- Migration: Multi-Pack (Main Course Showcase + Monthly / Batch Sub-Packs)
-- =========================================================================

-- 1. Mark whether a session_pack is a Main Multi-Pack container (no direct sessions/payment)
ALTER TABLE public.session_packs
ADD COLUMN IF NOT EXISTS is_multi_pack boolean DEFAULT false;

-- 2. Link Sub-Packs (e.g. August Month, September Month, 1st Batch, 2nd Batch) to their Main Multi-Pack
ALTER TABLE public.session_packs
ADD COLUMN IF NOT EXISTS parent_pack_id uuid REFERENCES public.session_packs(id) ON DELETE CASCADE DEFAULT NULL;

-- 3. Order index for Sub-Packs inside a Multi-Pack (0, 1, 2, ...)
ALTER TABLE public.session_packs
ADD COLUMN IF NOT EXISTS sub_pack_order integer DEFAULT 0;

-- 4. Default sequential batch unlock preference on the Main Multi-Pack
--    false = learners can enroll in any sub-pack directly (e.g. join September directly)
--    true  = step-by-step progression by default (Batch 1 -> Batch 2 -> Batch 3)
ALTER TABLE public.session_packs
ADD COLUMN IF NOT EXISTS sequential_unlock boolean DEFAULT false;

-- 5. Per-Sub-Pack toggle: require learner to be enrolled in the previous Sub-Pack first
ALTER TABLE public.session_packs
ADD COLUMN IF NOT EXISTS require_previous_pack boolean DEFAULT false;

-- 6. Fast lookup index for loading Sub-Packs of a Multi-Pack
CREATE INDEX IF NOT EXISTS idx_session_packs_parent_pack_id
ON public.session_packs(parent_pack_id, sub_pack_order);

-- 7. Backfill NULLs on existing rows
UPDATE public.session_packs
SET
  is_multi_pack = COALESCE(is_multi_pack, false),
  sub_pack_order = COALESCE(sub_pack_order, 0),
  sequential_unlock = COALESCE(sequential_unlock, false),
  require_previous_pack = COALESCE(require_previous_pack, false)
WHERE is_multi_pack IS NULL
   OR sub_pack_order IS NULL
   OR sequential_unlock IS NULL
   OR require_previous_pack IS NULL;
