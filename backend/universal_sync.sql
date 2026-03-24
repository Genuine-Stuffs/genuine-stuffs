-- ==========================================================
-- UNIVERSAL MARKETPLACE SYNC & RESET SCRIPT
-- ==========================================================
-- This script fixes RLS, Reassigns Materials, Updates Locations, and Syncs Prices.
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. FIX PERMISSIONS (RLS)
-- Ensure anyone can read basic vendor and material info for the marketplace
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON vendors;
CREATE POLICY "Public profiles are viewable by everyone" ON vendors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public materials are viewable by everyone" ON materials;
CREATE POLICY "Public materials are viewable by everyone" ON materials FOR SELECT USING (true);


-- 2. IDENTIFY CURRENT VENDOR & UPDATE LOCATION
-- We assume the most recently created vendor is the active one.
DO $$
DECLARE
    v_id UUID;
    v_name TEXT;
BEGIN
    SELECT id, company_name INTO v_id, v_name FROM vendors ORDER BY created_at DESC LIMIT 1;
    
    IF v_id IS NOT NULL THEN
        -- Force update vendor location to Uyo, Akwa Ibom (as seen in recent successful tests)
        UPDATE vendors SET city = 'Uyo', state = 'Akwa Ibom State' WHERE id = v_id;

        -- 3. REASSIGN ALL MATERIALS TO THIS VENDOR
        UPDATE materials SET vendor_id = v_id, vendor_name = v_name;

        -- 4. SYNC PRICES (2024-2025 Market Research)
        
        -- Task Atlantic Cooporation Products (New)
        UPDATE materials SET price = 1080000 WHERE vendor_id = v_id AND name = 'Rebar (Y12) High-Tensile';
        UPDATE materials SET price = 46500 WHERE vendor_id = v_id AND name = 'Binding Wire (Roll)';
        UPDATE materials SET price = 4500 WHERE vendor_id = v_id AND name = 'PPR Pipe (25mm)';
        UPDATE materials SET price = 75000 WHERE vendor_id = v_id AND name = 'Kitchen Sink (Double Bowl)';
        UPDATE materials SET price = 22800 WHERE vendor_id = v_id AND name = 'Armoured Cable (4-Core, 16mm)';
        UPDATE materials SET price = 23485.11 WHERE vendor_id = v_id AND name = 'LED Panel Light (18W)';

    END IF;
END $$;


-- 5. SYNC ORIGINAL PLATFORM PRICES (General)
UPDATE materials SET price = 4500 WHERE name = 'Plumbing Network Pipes';
UPDATE materials SET price = 34500 WHERE name = 'Coleman Copper Cable (1.5mm)';
UPDATE materials SET price = 21000 WHERE name = 'Polished Granite Slabs';
UPDATE materials SET price = 7050 WHERE name = 'Longspan Aluminum Roofing (0.55mm)';
UPDATE materials SET price = 8000 WHERE name = 'Vitrified Floor Tiles (60x60)';
UPDATE materials SET price = 42000 WHERE name = 'Premium Wall Paint (White)';
UPDATE materials SET price = 1080000 WHERE name = 'Reinforcement Steel (12mm)';
UPDATE materials SET price = 10450 WHERE name = 'Portland Cement (Dangote)';


-- 6. VERIFICATION REPORT
SELECT 
    m.name as product, 
    m.price, 
    m.unit, 
    v.company_name as vendor, 
    v.city, 
    v.state
FROM materials m
LEFT JOIN vendors v ON m.vendor_id = v.id
ORDER BY m.name;
