-- RUN THIS IN THE SUPABASE SQL EDITOR
-- This script adds more Steel, Plumbing, and Electrical products for the current vendor.
-- It dynamically fetches the most recently registered vendor to avoid ID typos.

DO $$
DECLARE
    v_id UUID;
    v_name TEXT;
BEGIN
    -- Get the ID and Name of the most recently registered vendor
    SELECT id, company_name INTO v_id, v_name FROM vendors ORDER BY created_at DESC LIMIT 1;

    -- Only proceed if a vendor was found
    IF v_id IS NOT NULL THEN
        -- Delete any previous attempts to avoid duplicates if re-run
        DELETE FROM materials WHERE vendor_id = v_id AND name IN (
            'Rebar (Y12) High-Tensile', 'Binding Wire (Roll)', 'PPR Pipe (25mm)', 
            'Kitchen Sink (Double Bowl)', 'Armoured Cable (4-Core, 16mm)', 'LED Panel Light (18W)'
        );

        INSERT INTO materials (
            name, 
            category, 
            price, 
            unit, 
            description, 
            availability, 
            vendor_id, 
            vendor_name, 
            image_url, 
            is_verified, 
            rating, 
            tags, 
            co2_footprint
        ) VALUES 
        -- Steel & Iron
        (
            'Rebar (Y12) High-Tensile', 
            'Steel & Iron', 
            1850000, 
            'Ton', 
            'Standard 12mm high-tensile reinforcement steel bars for structural concrete.', 
            'In Stock', 
            v_id, 
            v_name, 
            '/images/materials/high_tensile_rebar_y12.png', 
            true, 5.0, '{Steel, Construction}', 'High Impact'
        ),
        (
            'Binding Wire (Roll)', 
            'Steel & Iron', 
            45000, 
            'Roll', 
            'Flexible black annealed binding wire for securing reinforcements.', 
            'In Stock', 
            v_id, 
            v_name, 
            '/images/materials/binding_wire_roll.png', 
            true, 5.0, '{Hardware, Binding}', 'Low Impact'
        ),
        -- Plumbing
        (
            'PPR Pipe (25mm)', 
            'Plumbing', 
            5500, 
            '4m Length', 
            'Premium green PPR pipes for hot and cold water distribution.', 
            'In Stock', 
            v_id, 
            v_name, 
            '/images/materials/ppr_pipe_25mm.png', 
            true, 5.0, '{Plumbing, Water}', 'Moderate'
        ),
        (
            'Kitchen Sink (Double Bowl)', 
            'Plumbing', 
            85000, 
            'Set', 
            'Stainless steel double bowl kitchen sink with drainage board.', 
            'In Stock', 
            v_id, 
            v_name, 
            '/images/materials/double_bowl_kitchen_sink.png', 
            true, 5.0, '{Finishing, Kitchen}', 'Moderate'
        ),
        -- Electrical
        (
            'Armoured Cable (4-Core, 16mm)', 
            'Electrical', 
            12500, 
            'Meter', 
            'Heavy-duty underground armoured cable for main power distribution.', 
            'In Stock', 
            v_id, 
            v_name, 
            '/images/materials/armoured_cable_4core.png', 
            true, 5.0, '{Power, Industrial}', 'High Impact'
        ),
        (
            'LED Panel Light (18W)', 
            'Electrical', 
            4500, 
            'Unit', 
            'Energy-efficient recessed LED panel light for interior ceilings.', 
            'In Stock', 
            v_id, 
            v_name, 
            '/images/materials/led_panel_light_18w.png', 
            true, 5.0, '{Lighting, Interior}', 'Low Impact'
        );
    END IF;
END $$;

-- Verify the update
SELECT name, vendor_name, vendor_id FROM materials ORDER BY created_at DESC LIMIT 10;
