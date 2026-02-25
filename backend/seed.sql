-- Final Stable Seed Data for Material Insight Pros Marketplace
-- Using verified local assets and highly reliable Unsplash images

TRUNCATE TABLE materials CASCADE;

INSERT INTO materials (name, category, price, unit, image_url, description, vendor_name, availability, tags, is_verified, rating, co2_footprint)
VALUES 
-- CEMENT & AGGREGATES (Verified Local Assets)
('Portland Cement (Dangote)', 'Cement & Aggregates', 12500, '50kg Bag', '/images/materials/cement.png', 'Multi-purpose 42.5N grade cement for all construction stages.', 'Dangote Group', 'In Stock', ARRAY['High Strength', 'Tropical Formula'], true, 4.8, 'High Impact'),
('Quarry Granite (3/4 inch)', 'Cement & Aggregates', 185000, '20 Ton Truck', '/images/materials/granite.png', 'Washed basalt granite for high-strength concrete mixes.', 'Lafarge Quarries', 'In Stock', ARRAY['Structural', 'Crushed'], true, 4.5, 'Medium Impact'),
('Sharp River Sand', 'Cement & Aggregates', 145000, '20 Ton Truck', '/images/materials/sand.png', 'Clean, sharp river sand screened for purity.', 'Atanda Granites', 'In Stock', ARRAY['Clean', 'Screened'], true, 4.2, 'Low Impact'),

-- STEEL & IRON (Verified Local Asset)
('Reinforcement Steel (12mm)', 'Steel & Iron', 850000, 'Ton', '/images/materials/steel.png', 'High-yield TMT bars for structural reinforcement.', 'Universal Steel', 'In Stock', ARRAY['TMT', 'FE500'], true, 4.9, 'Medium Impact'),

-- FINISHING & FLOORING (Verified Local Asset)
('Vitrified Floor Tiles (60x60)', 'Flooring', 8500, 'sqm', '/images/materials/tiles.png', 'Marble-finish vitrified tiles for premium indoor flooring.', 'Royal Ceramics', 'In Stock', ARRAY['Non-Slip', 'Water Resistant'], true, 4.6, 'Low Impact'),

-- ROOFING (High-Stability Link)
('Longspan Aluminum Roofing (0.55mm)', 'Roofing', 5200, 'Linear Meter', 'https://images.unsplash.com/photo-1635424710928-0544e8512eea?auto=format&fit=crop&w=800&q=80', 'Premium gauge aluminum roofing sheets with anti-fade coating.', 'Alu-Prime Systems', 'In Stock', ARRAY['Anti-Corrosion', 'Heat Reflecting'], true, 4.5, 'Medium Impact'),

-- FLOORING (Polished Slab - Better Link)
('Polished Granite Slabs', 'Flooring', 25000, 'sqm', 'https://images.unsplash.com/photo-1603120286981-37887349942a?auto=format&fit=crop&w=800&q=80', 'Natural black galaxy granite slabs for countertops and floors.', 'Nigerian Granite Hub', 'Low Stock', ARRAY['Natural Stone', 'Luxury'], true, 4.8, 'Low Impact'),

-- PAINT (High-Stability Link)
('Premium Wall Paint (White)', 'Finishing', 42000, '20L Bucket', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80', 'High-opacity brilliant white emulsion for interior walls.', 'Dulux Nigeria', 'In Stock', ARRAY['Washable', 'Low VOC'], true, 4.7, 'Eco-Friendly'),

-- ELECTRICAL (Industrial Quality Link)
('Coleman Copper Cable (1.5mm)', 'Electrical', 35000, '100m Roll', 'https://images.unsplash.com/photo-1558444473-111537175525?auto=format&fit=crop&w=800&q=80', 'Pure copper wiring for residential electrical installations.', 'Coleman Wires & Cables', 'In Stock', ARRAY['Fire Retardant', 'Pure Copper'], true, 4.9, 'Medium Impact'),

-- PLUMBING (Industrial Quality Link)
('Plumbing Network Pipes', 'Plumbing', 12500, 'Length', 'https://images.unsplash.com/photo-1585704032915-c3400ca1f963?auto=format&fit=crop&w=800&q=80', 'Durable PVC pressure pipes for water distribution networks.', 'Kaka Plumbing', 'In Stock', ARRAY['Standard PN10', 'UV Protected'], true, 4.3, 'Low Impact');
