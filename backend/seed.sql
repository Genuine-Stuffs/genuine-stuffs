-- Final Stable Seed Data for Material Insight Pros Marketplace
-- Using verified local assets and highly reliable Unsplash images

TRUNCATE TABLE materials CASCADE;

INSERT INTO materials (name, category, price, unit, image_url, description, vendor_name, availability, tags, is_verified, rating, co2_footprint)
VALUES 
-- CEMENT & AGGREGATES (Verified Local Assets)
('Portland Cement (Dangote)', 'Cement & Aggregates', 10450, '50kg Bag', '/images/materials/cement_bags.png', 'Multi-purpose 42.5N grade cement for all construction stages.', 'Dangote Group', 'In Stock', ARRAY['High Strength', 'Tropical Formula'], true, 4.8, 'High Impact'),
('Quarry Granite (3/4 inch)', 'Cement & Aggregates', 185000, '20 Ton Truck', '/images/materials/granite.png', 'Washed basalt granite for high-strength concrete mixes.', 'Lafarge Quarries', 'In Stock', ARRAY['Structural', 'Crushed'], true, 4.5, 'Medium Impact'),
('Sharp River Sand', 'Cement & Aggregates', 145000, '20 Ton Truck', '/images/materials/sand.png', 'Clean, sharp river sand screened for purity.', 'Atanda Granites', 'In Stock', ARRAY['Clean', 'Screened'], true, 4.2, 'Low Impact'),

-- STEEL & IRON (Verified Local Asset)
('Reinforcement Steel (12mm)', 'Steel & Iron', 850000, 'Ton', '/images/materials/steel_rebars.png', 'High-yield TMT bars for structural reinforcement.', 'Universal Steel', 'In Stock', ARRAY['TMT', 'FE500'], true, 4.9, 'Medium Impact'),

-- FINISHING & FLOORING (Verified Local Asset)
('Vitrified Floor Tiles (60x60)', 'Flooring', 8500, 'sqm', '/images/materials/floor_tiles.png', 'Marble-finish vitrified tiles for premium indoor flooring.', 'Royal Ceramics', 'In Stock', ARRAY['Non-Slip', 'Water Resistant'], true, 4.6, 'Low Impact'),

-- ROOFING (Verified Local Asset)
('Longspan Aluminum Roofing (0.55mm)', 'Roofing', 5200, 'Linear Meter', '/images/materials/roofing_sheets.png', 'Premium gauge aluminum roofing sheets with anti-fade coating.', 'Alu-Prime Systems', 'In Stock', ARRAY['Anti-Corrosion', 'Heat Reflecting'], true, 4.5, 'Medium Impact'),

-- FLOORING (Polished Slab - Verified Local Asset)
('Polished Granite Slabs', 'Flooring', 25000, 'sqm', '/images/materials/granite_slabs.png', 'Natural black galaxy granite slabs for countertops and floors.', 'Nigerian Granite Hub', 'Low Stock', ARRAY['Natural Stone', 'Luxury'], true, 4.8, 'Low Impact'),

-- PAINT (Verified Local Asset)
('Premium Wall Paint (White)', 'Finishing', 42000, '20L Bucket', '/images/materials/dulux_paint.png', 'High-opacity brilliant white emulsion for interior walls.', 'Dulux Nigeria', 'In Stock', ARRAY['Washable', 'Low VOC'], true, 4.7, 'Eco-Friendly'),

-- ELECTRICAL (Verified Local Asset)
('Coleman Copper Cable (1.5mm)', 'Electrical', 35000, '100m Roll', '/images/materials/copper_cables.png', 'Pure copper wiring for residential electrical installations.', 'Coleman Wires & Cables', 'In Stock', ARRAY['Fire Retardant', 'Pure Copper'], true, 4.9, 'Medium Impact'),

-- PLUMBING (Verified Local Asset)
('Plumbing Network Pipes', 'Plumbing', 12500, 'Length', '/images/materials/plumbing_pipes.png', 'Durable PVC pressure pipes for water distribution networks.', 'Kaka Plumbing', 'In Stock', ARRAY['Standard PN10', 'UV Protected'], true, 4.3, 'Low Impact');
