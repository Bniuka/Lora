-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLE CREATION
-- =========================================================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text CHECK (role IN ('creator', 'learner')),
    name text,
    full_name text,
    email text,
    bio text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    first_name text,
    last_name text,
    category text,
    profile_photo_url text
);

-- Session Packs Table
CREATE TABLE IF NOT EXISTS public.session_packs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text,
    description text,
    price numeric,
    created_at timestamp without time zone DEFAULT now()
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_name text NOT NULL,
    price numeric NOT NULL,
    status text CHECK (status IN ('active', 'expired')),
    start_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
    end_date timestamp with time zone
);

-- Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    price numeric NOT NULL,
    category text,
    payment_link text,
    preview_video_url text,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    intro_video_url text
);

-- Videos Table
CREATE TABLE IF NOT EXISTS public.videos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    video_path text
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    zoom_link text,
    price numeric NOT NULL,
    date_time timestamp with time zone NOT NULL,
    payment_link text,
    pack_id uuid REFERENCES public.session_packs(id) ON DELETE SET NULL,
    video_uid text
);

-- Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text CHECK (type IN ('course', 'session')),
    item_id uuid NOT NULL,
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    payment_code text UNIQUE NOT NULL,
    screenshot_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    pack_id uuid REFERENCES public.session_packs(id) ON DELETE SET NULL
);

-- Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    content text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Course Videos Table
CREATE TABLE IF NOT EXISTS public.course_videos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    video_url text NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 3. POLICIES CREATION
-- =========================================================================

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Session Packs Policies
CREATE POLICY "select policy" ON public.session_packs
    FOR SELECT USING (true);

CREATE POLICY "insert policy" ON public.session_packs
    FOR INSERT WITH CHECK (true);

-- Subscriptions Policies
CREATE POLICY "Creators can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = creator_id);

-- Courses Policies
CREATE POLICY "Courses are viewable by everyone" ON public.courses
    FOR SELECT USING (true);

CREATE POLICY "Creators can insert their own courses" ON public.courses
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own courses" ON public.courses
    FOR UPDATE USING (auth.uid() = creator_id);

-- Videos Policies
CREATE POLICY "Creator can view videos" ON public.videos
    FOR SELECT USING (auth.uid() IN (SELECT courses.creator_id FROM public.courses WHERE courses.id = videos.course_id));

CREATE POLICY "Creators can manage course videos" ON public.videos
    FOR ALL USING (auth.uid() IN (SELECT courses.creator_id FROM public.courses WHERE courses.id = videos.course_id));

CREATE POLICY "Learners can view paid videos" ON public.videos
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.purchases
        WHERE purchases.learner_id = auth.uid()
          AND purchases.item_id = videos.course_id
          AND purchases.payment_status = 'paid'
          AND purchases.type = 'course'
    ));

-- Sessions Policies
CREATE POLICY "Sessions are viewable by everyone" ON public.sessions
    FOR SELECT USING (true);

CREATE POLICY "Creators can insert their own sessions" ON public.sessions
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own sessions" ON public.sessions
    FOR UPDATE USING (auth.uid() = creator_id);

-- Purchases Policies
CREATE POLICY "Learners can view their purchases" ON public.purchases
    FOR SELECT USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert purchases" ON public.purchases
    FOR INSERT WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Creators can view their item purchases" ON public.purchases
    FOR SELECT USING (
        (type = 'course' AND EXISTS (SELECT 1 FROM public.courses WHERE courses.id = purchases.item_id AND courses.creator_id = auth.uid()))
        OR
        (type = 'session' AND EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = purchases.item_id AND sessions.creator_id = auth.uid()))
    );

CREATE POLICY "Creators can update their item purchases" ON public.purchases
    FOR UPDATE USING (
        (type = 'course' AND EXISTS (SELECT 1 FROM public.courses WHERE courses.id = purchases.item_id AND courses.creator_id = auth.uid()))
        OR
        (type = 'session' AND EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = purchases.item_id AND sessions.creator_id = auth.uid()))
    );

-- Comments Policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Learners can leave comments on purchased courses" ON public.comments
    FOR INSERT WITH CHECK (
        auth.uid() = learner_id 
        AND EXISTS (
            SELECT 1 FROM public.purchases 
            WHERE purchases.learner_id = auth.uid() 
              AND purchases.item_id = comments.course_id 
              AND purchases.payment_status = 'paid'
        )
    );

-- Course Videos Policies
CREATE POLICY "Allow public read access" ON public.course_videos
    FOR SELECT USING (true);

CREATE POLICY "Allow creators to manage videos" ON public.course_videos
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.courses 
        WHERE courses.id = course_videos.course_id 
          AND courses.creator_id = auth.uid()
    ));

-- =========================================================================
-- 4. STORAGE BUCKETS & POLICIES SETUP
-- =========================================================================
-- Insert buckets if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('public-assets', 'public-assets', true),
    ('course-content', 'course-content', true),
    ('course-videos', 'course-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'avatars'
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow Authenticated Uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Allow Individuals to Update Own Files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow Individuals to Delete Own Files" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage Policies for 'public-assets'
CREATE POLICY "Public assets are viewable by everyone." ON storage.objects
    FOR SELECT USING (bucket_id = 'public-assets');

CREATE POLICY "Users can upload to public assets" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'public-assets' AND auth.uid() IS NOT NULL);

-- Storage Policies for 'course-content'
CREATE POLICY "Auth Upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'course-content' AND auth.role() = 'authenticated');

-- Storage Policies for 'course-videos'
CREATE POLICY "Creators can upload to videos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'course-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Video bucket is viewable by creators" ON storage.objects
    FOR SELECT USING (bucket_id = 'course-videos' AND auth.uid() IN (
        SELECT courses.creator_id FROM public.courses 
        WHERE courses.id::text = (storage.objects.path_tokens)[1]
    ));

CREATE POLICY "Learners can view videos if bought" ON storage.objects
    FOR SELECT USING (bucket_id = 'course-videos');
