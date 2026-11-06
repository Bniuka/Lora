-- =========================================================================
-- Migration: Real-Time Course Reviews & Authentic Comments System
-- Enables real student reviews, ratings, verified badges, and real-time feed
-- =========================================================================

-- 1. Create pack_reviews table
CREATE TABLE IF NOT EXISTS public.pack_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id uuid NOT NULL REFERENCES public.session_packs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text NOT NULL,
    is_verified_learner boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    creator_reply text DEFAULT NULL,
    creator_replied_at timestamptz DEFAULT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_pack_review UNIQUE (user_id, pack_id)
);

-- 2. Indexes for instant queries and ordering
CREATE INDEX IF NOT EXISTS idx_pack_reviews_pack_id ON public.pack_reviews(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_reviews_user_id ON public.pack_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_reviews_created_at ON public.pack_reviews(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.pack_reviews ENABLE ROW LEVEL SECURITY;

-- 4. Policies:
-- Drop old policies if re-running
DROP POLICY IF EXISTS "Public reviews are viewable by everyone" ON public.pack_reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.pack_reviews;
DROP POLICY IF EXISTS "Users and creators can update reviews" ON public.pack_reviews;
DROP POLICY IF EXISTS "Users and creators can delete reviews" ON public.pack_reviews;

-- Anyone (public, learners, guests) can view reviews
CREATE POLICY "Public reviews are viewable by everyone" 
ON public.pack_reviews
FOR SELECT 
USING (true);

-- Authenticated users can insert their own review
CREATE POLICY "Authenticated users can insert reviews" 
ON public.pack_reviews
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Authors can edit their own reviews, and creators can reply
CREATE POLICY "Users and creators can update reviews" 
ON public.pack_reviews
FOR UPDATE 
USING (
    auth.uid() = user_id 
    OR 
    auth.uid() IN (SELECT creator_id FROM public.session_packs WHERE session_packs.id = pack_reviews.pack_id)
);

-- Authors can delete their own review, and creators can moderate
CREATE POLICY "Users and creators can delete reviews" 
ON public.pack_reviews
FOR DELETE 
USING (
    auth.uid() = user_id
    OR
    auth.uid() IN (SELECT creator_id FROM public.session_packs WHERE session_packs.id = pack_reviews.pack_id)
);

-- 5. Enable Supabase Realtime publication for pack_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'pack_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pack_reviews;
  END IF;
END $$;
