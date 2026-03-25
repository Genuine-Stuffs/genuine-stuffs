-- Migration to support LinkedIn-style Professional Profiles

-- Add new columns to professionals table
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS connections_count INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS professional_type TEXT DEFAULT 'professional' CHECK (professional_type IN ('professional', 'artisan'));

-- Create professional_experiences table
CREATE TABLE IF NOT EXISTS professional_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  employment_type TEXT, -- e.g., 'Full-time', 'Freelance', 'Contract'
  location TEXT,
  location_type TEXT, -- e.g., 'Remote', 'On-site', 'Hybrid'
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  skills JSONB DEFAULT '[]', -- List of strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for professional_experiences
ALTER TABLE professional_experiences ENABLE ROW LEVEL SECURITY;

-- Policies for professional_experiences
CREATE POLICY "Public profiles are viewable by everyone" 
ON professional_experiences FOR SELECT 
USING (true);

CREATE POLICY "Professionals can manage their own experiences" 
ON professional_experiences FOR ALL 
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- Optional: Create professional_skills table if we want a separate section
CREATE TABLE IF NOT EXISTS professional_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  endorsements_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(professional_id, skill_name)
);

ALTER TABLE professional_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public skills are viewable by everyone" 
ON professional_skills FOR SELECT 
USING (true);

CREATE POLICY "Professionals can manage their own skills" 
ON professional_skills FOR ALL 
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);
