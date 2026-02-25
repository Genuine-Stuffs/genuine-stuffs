-- Improved Seed Data for Material Insight Pros Marketplace
-- Using verified local assets and high-quality external images

TRUNCATE TABLE materials CASCADE;

INSERT INTO materials (name, category, price, unit, image_url, description, vendor_name, availability, tags, is_verified, rating, co2_footprint)
VALUES 
-- CEMENT & AGGREGATES (Using Local Assets)
('Portland Cement (Dangote)', 'Cement & Aggregates', 12500, '50kg Bag', '/images/materials/cement.png', 'Multi-purpose 42.5N grade cement for all construction stages.', 'Dangote Group', 'In Stock', ARRAY['High Strength', 'Tropical Formula'], true, 4.8, 'High Impact'),
('Quarry Granite (3/4 inch)', 'Cement & Aggregates', 185000, '20 Ton Truck', '/images/materials/granite.png', 'Washed basalt granite for high-strength concrete mixes.', 'Lafarge Quarries', 'In Stock', ARRAY['Structural', 'Crushed'], true, 4.5, 'Medium Impact'),
('Sharp River Sand', 'Cement & Aggregates', 145000, '20 Ton Truck', '/images/materials/sand.png', 'Clean, sharp river sand screened for purity.', 'Atanda Granites', 'In Stock', ARRAY['Clean', 'Screened'], true, 4.2, 'Low Impact'),

-- STEEL & IRON (Using Local Assets)
('Reinforcement Steel (12mm)', 'Steel & Iron', 850000, 'Ton', '/images/materials/steel.png', 'High-yield TMT bars for structural reinforcement.', 'Universal Steel', 'In Stock', ARRAY['TMT', 'FE500'], true, 4.9, 'Medium Impact'),

-- FINISHING & FLOORING (Using Local Asset)
('Vitrified Floor Tiles (60x60)', 'Flooring', 8500, 'sqm', '/images/materials/tiles.png', 'Marble-finish vitrified tiles for premium indoor flooring.', 'Royal Ceramics', 'In Stock', ARRAY['Non-Slip', 'Water Resistant'], true, 4.6, 'Low Impact'),

-- ROOFING & WALLS (Verified working Unsplash)
('Longspan Aluminum Roofing (0.55mm)', 'Roofing', 5200, 'Linear Meter', 'https://images.unsplash.com/photo-1635424710928-0544e8512eae?auto=format&fit=crop&w=800&q=80', 'Premium gauge aluminum roofing sheets with anti-fade coating.', 'Alu-Prime Systems', 'In Stock', ARRAY['Anti-Corrosion', 'Heat Reflecting'], true, 4.5, 'Medium Impact'),

-- NEW HIGH-QUALITY LINKS
('Polished Granite Slabs', 'Flooring', 25000, 'sqm', 'https://images.unsplash.com/photo-1628592102173-b7a89547f3ca?auto=format&fit=crop&w=800&q=80', 'Natural black galaxy granite slabs for countertops and floors.', 'Nigerian Granite Hub', 'Low Stock', ARRAY['Natural Stone', 'Luxury'], true, 4.8, 'Low Impact'),
('Premium Wall Paint (White)', 'Finishing', 42000, '20L Bucket', 'https://images.unsplash.com/photo-1562664377-709f2c337eb2?auto=format&fit=crop&w=800&q=80', 'High-opacity brilliant white emulsion for interior walls.', 'Dulux Nigeria', 'In Stock', ARRAY['Washable', 'Low VOC'], true, 4.7, 'Eco-Friendly'),

-- ELECTRICAL & PLUMBING (Better Links)
('Coleman Copper Cable (1.5mm)', 'Electrical', 35000, '100m Roll', 'https://plus.unsplash.com/premium_photo-1664195074915-fa266f5466c4?auto=format&fit=crop&w=800&q=80', 'Pure copper wiring for residential electrical installations.', 'Coleman Wires & Cables', 'In Stock', ARRAY['Fire Retardant', 'Pure Copper'], true, 4.9, 'Medium Impact'),
('Plumbing Network Pipes', 'Plumbing', 12500, 'Length', 'https://images.unsplash.com/photo-1615527359912-f47ff63842b0?auto=format&fit=crop&w=800&q=80', 'Durable PVC pressure pipes for water distribution networks.', 'Kaka Plumbing', 'In Stock', ARRAY['Standard PN10', 'UV Protected'], true, 4.3, 'Low Impact');
