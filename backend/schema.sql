-- Create Materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  vendor_id UUID REFERENCES auth.users(id),
  vendor_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  co2_footprint TEXT,
  availability TEXT CHECK (availability IN ('In Stock', 'Low Stock', 'Out of Stock')) DEFAULT 'In Stock',
  tags TEXT[],
  rating DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  address TEXT NOT NULL,
  cac_number TEXT NOT NULL,
  phone TEXT,
  categories TEXT[],
  verified_status TEXT CHECK (verified_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  bio TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT,
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Draft)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- Everyone can view verified materials
CREATE POLICY "Public can view verified materials" ON materials
  FOR SELECT USING (is_verified = true);

-- Vendors can manage their own products
CREATE POLICY "Vendors can manage own materials" ON materials
  FOR ALL USING (auth.uid() = vendor_id);

-- Seed Data (Optional for local testing)
INSERT INTO materials (name, category, price, unit, image_url, description, vendor_name, availability, tags, is_verified)
VALUES 
('Portland Cement (Dangote)', 'Cement & Aggregates', 12500, '50kg Bag', '/images/materials/cement.png', 'Multi-purpose 42.5N grade cement', 'Dangote Group', 'In Stock', ARRAY['High Strength', 'Tropical Formula'], true),
('Quarry Granite (3/4 inch)', 'Cement & Aggregates', 15000, 'Ton', '/images/materials/granite.png', 'Washed basalt granite', 'Lafarge Quarries', 'In Stock', ARRAY['Structural', 'Crushed'], true),
('Reinforcement Steel (16mm)', 'Steel & Iron', 650000, 'Ton', '/images/materials/steel.png', 'High-yield TMT bars', 'Universal Steel', 'In Stock', ARRAY['TMT', 'FE500'], true),
('Longspan Aluminum Roofing (0.55mm)', 'Roofing', 4500, 'sqm', 'https://images.unsplash.com/photo-1635424710928-0544e8512eae?auto=format&fit=crop&w=800&q=80', 'Premium gauge aluminum', 'Alu-Prime Systems', 'Low Stock', ARRAY['Corrosion Resistant'], true),
('Sharp River Sand (30 Tonnes)', 'Sand & Gravel', 450000, '30 Tonnes', '/images/materials/sand.png', 'Clean, sharp river sand', 'Atanda Granites & Stones Enterprises', 'In Stock', ARRAY['Clean', 'Sharp'], true);
