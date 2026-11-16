-- 1. Drop existing tables to start fresh
DROP TABLE IF EXISTS public.episodes CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;

-- 2. Re-create the STORIES table with user_id
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  premise TEXT,
  genre TEXT,
  rating TEXT DEFAULT 'T: teen',
  visibility TEXT DEFAULT 'Private',
  content_warnings TEXT,
  icon_color TEXT DEFAULT '#f45b95',
  icon_url TEXT,
  banner_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories are viewable by everyone or participants" 
  ON public.stories FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create stories" 
  ON public.stories FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own stories" 
  ON public.stories FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
  ON public.stories FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. Re-create the EPISODES table
CREATE TABLE public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'Episode',
  writer_permission TEXT DEFAULT 'Open: anyone in the story',
  episode_picture_url TEXT,
  season TEXT,
  location TEXT,
  plot_summary TEXT,
  tags TEXT[],
  is_ended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Episodes are viewable by everyone" 
  ON public.episodes FOR SELECT 
  USING (true);

CREATE POLICY "Story owners or participants can create episodes" 
  ON public.episodes FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Episodes can be updated by authors" 
  ON public.episodes FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Episodes can be deleted by authors" 
  ON public.episodes FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 4. Update POSTS table columns
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content_warning TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'character';

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.episodes;

CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are viewable by everyone" 
  ON public.channels FOR SELECT 
  USING (true);

CREATE POLICY "Story owners can create channels" 
  ON public.channels FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;