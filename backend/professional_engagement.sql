-- PROFESSIONAL ENGAGEMENT SCHEMA (Connections, Follows, Messages)
-- Run this in your Supabase SQL Editor

-- 1. Connections Table
CREATE TABLE IF NOT EXISTS public.professional_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(requester_id, receiver_id)
);

-- 2. Followers Table
CREATE TABLE IF NOT EXISTS public.professional_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(follower_id, following_id)
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.professional_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. RLS POLICIES
ALTER TABLE public.professional_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_messages ENABLE ROW LEVEL SECURITY;

-- Connections RLS: User can see their own connections
CREATE POLICY "Users can view their own connections" ON public.professional_connections
FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can request connections" ON public.professional_connections
FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can respond to connections" ON public.professional_connections
FOR UPDATE USING (auth.uid() = receiver_id);

-- Followers RLS: Public can see who follows whom, but only authenticated can follow
CREATE POLICY "Anyone can view followers" ON public.professional_followers
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow" ON public.professional_followers
FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.professional_followers
FOR DELETE USING (auth.uid() = follower_id);

-- Messages RLS: Private messaging
CREATE POLICY "Users can view their own messages" ON public.professional_messages
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.professional_messages
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5. TRIGGER FOR CONNECTION COUNT
CREATE OR REPLACE FUNCTION public.update_connections_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') OR (TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted') THEN
        UPDATE public.professionals SET connections_count = connections_count + 1 WHERE id = NEW.requester_id;
        UPDATE public.professionals SET connections_count = connections_count + 1 WHERE id = NEW.receiver_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'accepted') OR (TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND NEW.status != 'accepted') THEN
        UPDATE public.professionals SET connections_count = connections_count - 1 WHERE id = OLD.requester_id;
        UPDATE public.professionals SET connections_count = connections_count - 1 WHERE id = OLD.receiver_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_connections_count
AFTER INSERT OR UPDATE OR DELETE ON public.professional_connections
FOR EACH ROW EXECUTE FUNCTION public.update_connections_count();

-- 6. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_connections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.professional_followers TO authenticated;
GRANT SELECT, INSERT ON public.professional_messages TO authenticated;
GRANT SELECT ON public.professional_followers TO anon;
