-- RUN THIS IN THE SUPABASE SQL EDITOR
-- This script updates prices for ALL products based on current Nigerian market research (2024-2025).

-- 1. UPDATE NEW PRODUCTS (Task Atlantic Cooporation)
DO $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM vendors ORDER BY created_at DESC LIMIT 1;
    
    IF v_id IS NOT NULL THEN
        -- Rebar (Y12)
        UPDATE materials SET price = 1080000 WHERE vendor_id = v_id AND name = 'Rebar (Y12) High-Tensile';
        -- Binding Wire
        UPDATE materials SET price = 46500 WHERE vendor_id = v_id AND name = 'Binding Wire (Roll)';
        -- PPR Pipe
        UPDATE materials SET price = 4500 WHERE vendor_id = v_id AND name = 'PPR Pipe (25mm)';
        -- Kitchen Sink
        UPDATE materials SET price = 75000 WHERE vendor_id = v_id AND name = 'Kitchen Sink (Double Bowl)';
        -- Armoured Cable
        UPDATE materials SET price = 22800 WHERE vendor_id = v_id AND name = 'Armoured Cable (4-Core, 16mm)';
        -- LED Panel Light (Matched to Amazon Link)
        UPDATE materials SET price = 23485.11 WHERE vendor_id = v_id AND name = 'LED Panel Light (18W)';
    END IF;
END $$;

-- 2. UPDATE ORIGINAL PLATFORM PRODUCTS
UPDATE materials SET price = 4500 WHERE name = 'Plumbing Network Pipes';
UPDATE materials SET price = 34500 WHERE name = 'Coleman Copper Cable (1.5mm)';
UPDATE materials SET price = 21000 WHERE name = 'Polished Granite Slabs';
UPDATE materials SET price = 7050 WHERE name = 'Longspan Aluminum Roofing (0.55mm)';
UPDATE materials SET price = 8000 WHERE name = 'Vitrified Floor Tiles (60x60)';
UPDATE materials SET price = 42000 WHERE name = 'Premium Wall Paint (White)';
UPDATE materials SET price = 1080000 WHERE name = 'Reinforcement Steel (12mm)';
UPDATE materials SET price = 10450 WHERE name = 'Portland Cement (Dangote)';

-- 3. VERIFY ALL PRICES
SELECT name, price, unit, vendor_name FROM materials ORDER BY category, name;
