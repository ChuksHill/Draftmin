-- DRAFTMIN ENTERPRISE BACKEND SCHEMA
-- Paste this entire script into your Supabase SQL Editor (SQL Editor -> New Query -> Run)

-- =========================================================================
-- 1. EXTENSIONS & PREREQUISITES
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 2. USER PROFILES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Anonymous',
  avatar_url TEXT DEFAULT '',
  email TEXT NOT NULL UNIQUE
);

-- Enable Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- =========================================================================
-- 3. PROFILE AUTO-SYNC TRIGGER (Supabase Auth -> Public Profiles)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Anonymous'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 4. MEETINGS & ROOMS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  passcode TEXT, -- Optional password lock
  settings JSONB DEFAULT '{"mute_on_entry": false, "screen_share_disabled": false}'::jsonb NOT NULL
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can look up meeting details" ON public.meetings;
CREATE POLICY "Anyone can look up meeting details" ON public.meetings 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create meetings" ON public.meetings;
CREATE POLICY "Authenticated users can create meetings" ON public.meetings 
  FOR INSERT WITH CHECK (auth.uid() = host_id OR auth.uid() IS NULL); -- Fallback for guest testing

DROP POLICY IF EXISTS "Hosts can update their meetings" ON public.meetings;
CREATE POLICY "Hosts can update their meetings" ON public.meetings 
  FOR UPDATE USING (auth.uid() = host_id);

-- =========================================================================
-- 5. REAL-TIME TRANSCRIPTS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.transcripts (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  speaker_name TEXT NOT NULL,
  transcript_text TEXT NOT NULL
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Allow anyone view access (restricted logically by knowing meeting_id or in UI)
DROP POLICY IF EXISTS "View transcripts related to meetings" ON public.transcripts;
CREATE POLICY "View transcripts related to meetings" ON public.transcripts 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert speech segments" ON public.transcripts;
CREATE POLICY "Insert speech segments" ON public.transcripts 
  FOR INSERT WITH CHECK (true);

-- Index for speedy retrieval
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON public.transcripts(meeting_id);

-- =========================================================================
-- 6. AI MEETING SUMMARIES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  markdown_content TEXT NOT NULL,
  executive_summary TEXT,
  key_decisions JSONB DEFAULT '[]'::jsonb NOT NULL
);

ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View summaries related to meetings" ON public.meeting_summaries;
CREATE POLICY "View summaries related to meetings" ON public.meeting_summaries 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Write meeting summaries" ON public.meeting_summaries;
CREATE POLICY "Write meeting summaries" ON public.meeting_summaries 
  FOR INSERT WITH CHECK (true);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_summaries_meeting ON public.meeting_summaries(meeting_id);

-- =========================================================================
-- 7. ACTION ITEMS CHECKLIST
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  summary_id UUID REFERENCES public.meeting_summaries(id) ON DELETE CASCADE NOT NULL,
  task TEXT NOT NULL,
  assignee TEXT DEFAULT 'Unassigned'::text NOT NULL,
  priority TEXT DEFAULT 'Medium'::text NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  due_date DATE
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View action items" ON public.action_items;
CREATE POLICY "View action items" ON public.action_items 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modify action items" ON public.action_items;
CREATE POLICY "Modify action items" ON public.action_items 
  FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_action_items_summary ON public.action_items(summary_id);

-- =========================================================================
-- 8. ROOM CHAT CACHING
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.chat_history (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  sender_identity TEXT NOT NULL,
  message_text TEXT NOT NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View room chat history" ON public.chat_history;
CREATE POLICY "View room chat history" ON public.chat_history 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Send room chat message" ON public.chat_history;
CREATE POLICY "Send room chat message" ON public.chat_history 
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chat_meeting ON public.chat_history(meeting_id);

-- =========================================================================
-- 9. STORAGE BUCKETS (CHAT ATTACHMENTS)
-- =========================================================================
-- Create chat_attachments bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat_attachments',
  'chat_attachments',
  true,
  52428800, -- 50MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Attachments
DROP POLICY IF EXISTS "Public select on chat attachments" ON storage.objects;
CREATE POLICY "Public select on chat attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat_attachments');

DROP POLICY IF EXISTS "Public insert on chat attachments" ON storage.objects;
CREATE POLICY "Public insert on chat attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat_attachments');
