-- Create the blog posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to published posts
CREATE POLICY "Public can view published posts"
  ON public.posts
  FOR SELECT
  USING (published = true);

-- Create policy to allow authenticated users to manage posts
CREATE POLICY "Authenticated users can manage posts"
  ON public.posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
