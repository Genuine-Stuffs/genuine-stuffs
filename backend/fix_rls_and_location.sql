-- RUN THIS IN THE SUPABASE SQL EDITOR
-- This script fixes the RLS (Row Level Security) and verifies the vendor data.

-- 1. Enable Public Read access for the vendors table
-- This is NECESSARY for the Marketplace to "join" products with vendor locations.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON vendors;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.vendors 
FOR SELECT 
USING (true);

-- 2. List all vendors to verify someone is in the table
SELECT id, company_name, city, state FROM vendors;

-- 3. If the list above shows empty City/State, run this to set a default (e.g. for testing)
-- Replace 'Lagos' and 'Ikeja' with your desired location if it's different.
UPDATE vendors
SET 
    city = 'Lagos', 
    state = 'Ikeja'
WHERE city IS NULL OR state IS NULL;

-- 4. Final verification of the join
SELECT m.name as product, m.vendor_name, v.company_name, v.city, v.state
FROM materials m
LEFT JOIN vendors v ON m.vendor_id = v.id
LIMIT 10;
