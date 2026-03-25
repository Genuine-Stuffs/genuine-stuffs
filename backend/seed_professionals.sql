-- AEC MASTER SEED SCRIPT (Architectural, Engineering, Construction focus)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pxcgatrgtlvxkjwhjcfr/sql

-- 1. CLEANUP PREVIOUS DATA (Ensures no duplicates or broken entries)
TRUNCATE TABLE public.professionals CASCADE;

-- 2. Ensure schema is complete
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS professional_type TEXT DEFAULT 'professional';
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS connections_count INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 3. Create Supporting Tables if they don't exist
CREATE TABLE IF NOT EXISTS professional_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  employment_type TEXT,
  location TEXT,
  location_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  skills JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS professional_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  endorsements_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(professional_id, skill_name)
);

-- 4. Set RLS Policies
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON professionals;
CREATE POLICY "Public profiles are viewable by everyone" ON professionals FOR SELECT USING (true);

ALTER TABLE professional_experiences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public experiences are viewable by everyone" ON professional_experiences;
CREATE POLICY "Public experiences are viewable by everyone" ON professional_experiences FOR SELECT USING (true);

ALTER TABLE professional_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public skills are viewable by everyone" ON professional_skills;
CREATE POLICY "Public skills are viewable by everyone" ON professional_skills FOR SELECT USING (true);

GRANT SELECT ON professionals TO anon, authenticated;
GRANT SELECT ON professional_experiences TO anon, authenticated;
GRANT SELECT ON professional_skills TO anon, authenticated;

-- 5. SEED DATA RECONCILIATION
DO $$
DECLARE
    u_id UUID;
BEGIN
    -- PROFESSIONALS (12)
    
    -- 1. Victor Effeh
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'victor.effeh.pro@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, cover_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Victor Effeh', 'Chartered Architect', 'Senior BIM Architect | Specialist in Sustainable Urban Master-Planning', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop', 'professional', true, 'Enugu', 'Enugu', 'Award-winning architect with 15 years experience in sustainable urban development and high-density residential design.');
    INSERT INTO public.professional_experiences (professional_id, title, company, start_date, is_current, description)
    VALUES (u_id, 'Principal Architect', 'Effeh & Partners', '2016-05-01', true, 'Overseeing major commercial developments and sustainable housing projects across West Africa.');

    -- 2. Bilal Rahman
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'bilal.rahman.eng@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, cover_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Bilal Rahman', 'Structural Engineer', 'Chartered Structural Engineer | High-Rise Reinforced Concrete & Steel Specialist', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop', 'https://images.unsplash.com/photo-1503387762-5929a5154bce?q=80&w=800&auto=format&fit=crop', 'professional', true, 'Lagos', 'Lekki', 'Specializing in structural integrity analysis and high-performance concrete design for skyscrapers.');

    -- 3. Morire Olusegun
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'morire.olusegun@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, cover_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Morire Olusegun', 'Interior Architect', 'Lead Interior Architect | Luxury Commercial & Residential Fit-out Specialist', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop', 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop', 'professional', true, 'Oyo', 'Ibadan', 'Merging aesthetics with technical precision to create inspiring workspaces and living environments.');

    -- 4. Adogie Ehizogie
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'adogie.ehizogie@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Adogie Ehizogie', 'Principal Quantity Surveyor', 'Principal Quantity Surveyor | Expert in Procurement & Project Cost Management', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Edo', 'Benin City', 'Expert in project cost management, ensuring financial viability from inception to completion.');

    -- 5. Akinmolayan Babatunde
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'tunde.akin@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Akinmolayan Babatunde', 'Construction PM', 'Senior Construction Project Manager | MEP & Infrastructure Lifecycle Lead', 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?q=80&w=400&auto=format&fit=crop', 'professional', true, 'FCT Abuja', 'Garki', 'Managing complex infrastructure projects with a focus on timeline, budget, and quality compliance.');

    -- 6. Oluwatobi Pascal
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'pascal.olua@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Oluwatobi Pascal', 'Civil Engineer', 'Principal Civil Engineer | Infrastructure Design for Road & Drainage Systems', 'https://images.unsplash.com/photo-1552058544-bd2d08422138?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Rivers', 'Port Harcourt', 'Building the backbone of nations through durable civil infrastructure and traffic systems.');

    -- 7. Toye Olawale
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'toye.olawale@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Toye Olawale', 'Electrical Systems Lead', 'MEP Electrical Lead | Building Automation & Power Systems Specialist', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Lagos', 'Ikeja', 'Integrating renewable power and intelligent automation into modern building envelopes.');

    -- 8. Oluku Judith
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'judith.oluku@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Oluku Judith', 'Sustainability Lead', 'Sustainability Lead | LEED/EDGE Certified Design Specialist', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Lagos', 'Victoria Island', 'Leading the green transition in West African real estate through certification and eco-design.');

    -- 9. Samuel Eke
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'samuel.eke@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Samuel Eke', 'Geotechnical Lead', 'Geotechnical Lead | Foundation Investigations & Soil Mechanics Expert', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Delta', 'Warri', 'Technical expert in subsurface exploration and soil mechanics for structural safety.');

    -- 10. Chidi Okafor
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'chidi.okafor@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Chidi Okafor', 'Senior MEP Specialist', 'Senior HVAC & Mechanical Lead | Precision Climate & Industrial Piping', 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Anambra', 'Onitsha', 'Design and implementation of complex mechanical, electrical and plumbing systems.');

    -- 11. Aminu Bello
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'aminu.bello@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Aminu Bello', 'Land Surveyor', 'Chief Registered Land Surveyor | GIS, Topographic & Cadastral Surveys', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Kano', 'Kano', 'Providing precision spatial data for construction, mining and regional planning.');

    -- 12. Fatima Yusuf
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'fatima.yusuf@gs.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Fatima Yusuf', 'Urban Planner', 'Urban Development Planner | Sustainable City Layouts & Zoning Policy', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop', 'professional', true, 'Kaduna', 'Kaduna', 'Strategizing urban layouts for sustainable growth and community resilience.');


    -- ARTISANS (8)
    
    -- 1. Tunde Bakare
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'tunde.bakare@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Tunde Bakare', 'Master Plumber', 'Master Plumbing Technician | High-Pressure Industrial Water Reticulation', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Lagos', 'Ajah', 'Expert in residential and industrial plumbing systems with focus on efficiency and durability.');

    -- 2. Ibrahim Musa
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'ibrahim.musa@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Ibrahim Musa', 'Senior Welder', 'Senior Structural Welder | Precision TIG/MIG Metal Fabrication', 'https://images.unsplash.com/photo-1504917595217-d4dc5fec12f4?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Kwara', 'Ilorin', 'Providing high-strength structural welding for heavy machinery and building frames.');

    -- 3. Emeka Obi
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'emeka.obi@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Emeka Obi', 'Furniture Carpenter', 'Lead Finishing Carpenter | Bespoke Millwork & Cabinetry Craftsman', 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Imo', 'Owerri', 'Crafting custom interiors and structural wood elements with traditional and modern techniques.');

    -- 4. Kalu Sunday
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'kalu.sunday@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Kalu Sunday', 'Floor Specialist', 'Master Tiling Specialist | Italian Marble & Large-Format Porcelain Installation', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Abia', 'Umuahia', 'Installing premium flooring solutions with artistic precision and long-lasting quality.');

    -- 5. Segun Adebayo
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'segun.adebayo@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Segun Adebayo', 'Decorative Painter', 'Deep Finish Coatings Expert | Stucco, Venetian Plastering & Epoxy Floors', 'https://images.unsplash.com/photo-1534073828943-f801091bb28c?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Ogun', 'Abeokuta', 'Master of textured finishes and architectural coatings for premium aesthetics.');

    -- 6. Musa Garba
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'musa.garba@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Musa Garba', 'Master Mason', 'Master Mason & Stone-Mason | Specialist in Natural Stone Cladding & Structural Masonry', 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Kebbi', 'Birnin Kebbi', 'Skilled in traditional and modern masonry, from structural shells to natural stone cladding.');

    -- 7. John Bull
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'john.bull@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'John Bull', 'Industrial Electrician', 'Accredited Industrial Electrician | Switchgear & Main Power Board Installation', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Lagos', 'Ikorodu', 'Reliable electrical infrastructure installation and maintenance for commercial and residential sectors.');

    -- 8. Umar Farouk
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at) VALUES (u_id, 'umar.farouk@artisan.com', '{"role": "professional"}', now());
    INSERT INTO public.professionals (id, full_name, specialty, headline, avatar_url, professional_type, is_verified, state, city, bio)
    VALUES (u_id, 'Umar Farouk', 'Roofing Expert', 'Lead Roofing Specialist | Master of Stepped-Tile & Stone-Coated Systems', 'https://images.unsplash.com/photo-1635424710928-0544e8512eae?q=80&w=400&auto=format&fit=crop', 'artisan', true, 'Nasarawa', 'Lafia', 'Delivering leak-proof and aesthetically pleasing roofing solutions for diverse building types.');

END $$;
