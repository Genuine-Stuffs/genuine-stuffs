-- Seed file to populate the remaining categories with verified NIS materials

INSERT INTO materials (name, category, price, unit, image_url, description, vendor_name, is_verified, availability)
VALUES 
  -- Logistics
  ('Heavy Duty Mack Truck Hire', 'Logistics', 150000, 'Trip', 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&q=80', '30-ton capacity Mack truck for aggregate delivery within state.', 'Task Atlantic Logistics', true, 'In Stock'),
  ('Flatbed Trailer 40ft', 'Logistics', 200000, 'Day', 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&q=80', '40ft flatbed trailer for steel and heavy equipment haulage.', 'Task Atlantic Logistics', true, 'In Stock'),

  -- Equipment
  ('Concrete Mixer (200L)', 'Equipment', 45000, 'Day', 'https://images.unsplash.com/photo-1541888081600-b6f4cc14d2e5?w=800&q=80', 'Diesel powered concrete mixer for on-site batching.', 'BuildEquip Rentals', true, 'In Stock'),
  ('Scaffolding Frames (Set)', 'Equipment', 2500, 'Week', 'https://images.unsplash.com/photo-1533227268428-f9ed0900f9bf?w=800&q=80', 'Standard H-frame scaffolding set with cross braces.', 'BuildEquip Rentals', true, 'In Stock'),

  -- Sand & Gravel
  ('Sharp Sand (Plastering)', 'Sand & Gravel', 85000, '20-Ton Truck', 'https://images.unsplash.com/photo-1584820927506-69d9c228805f?w=800&q=80', 'Clean river sharp sand, double-washed for premium plastering.', 'Task Atlantic Coops', true, 'In Stock'),
  ('Granite Chipping (3/4 Inch)', 'Sand & Gravel', 220000, '30-Ton Truck', 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800&q=80', 'High strength crushed granite for structural concrete.', 'Ogun Quarries Ltd', true, 'In Stock'),

  -- Blocks & Bricks
  ('9-Inch Vibrated Block (Hollow)', 'Blocks & Bricks', 550, 'Unit', 'https://images.unsplash.com/photo-1518640026210-91c6e61de7d6?w=800&q=80', 'Machine-vibrated 9-inch hollow sandcrete blocks, cured for 21 days.', 'Premium Blocks Co', true, 'In Stock'),
  ('6-Inch Vibrated Block (Solid)', 'Blocks & Bricks', 480, 'Unit', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80', 'Solid 6-inch load-bearing blocks for partition walls.', 'Premium Blocks Co', true, 'In Stock'),

  -- Paints
  ('Dulux Premium Emulsion (White)', 'Paints', 42000, '20L Bucket', '/images/materials/paint.jpg', 'Premium interior emulsion paint with anti-fungal properties.', 'Dulux Nigeria', true, 'In Stock'),
  ('Berger Texcote Exterior', 'Paints', 48000, '20L Bucket', 'https://images.unsplash.com/photo-1562184552-32a76f2d5045?w=800&q=80', 'Textured exterior wall coating, weather and UV resistant.', 'Berger Paints', true, 'In Stock'),

  -- Site Water
  ('Construction Water Supply', 'Site Water', 25000, '10,000L Tanker', 'https://images.unsplash.com/photo-1541888081600-b6f4cc14d2e5?w=800&q=80', 'Clean bore-hole water delivered via 10,000L tanker for site mixing.', 'Aqua Logistics', true, 'In Stock'),
  
  -- Tools
  ('Bosch Professional Rotary Hammer', 'Tools', 185000, 'Unit', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80', 'Heavy duty SDS-plus rotary hammer drill with chiseling function.', 'ToolMall NG', true, 'In Stock'),
  ('DeWalt Angle Grinder (9-inch)', 'Tools', 145000, 'Unit', 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80', '2200W large angle grinder for heavy metal and masonry cutting.', 'ToolMall NG', true, 'In Stock'),

  -- Doors & Windows
  ('Turkish Security Door (Single)', 'Doors & Windows', 280000, 'Unit', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80', 'Premium steel security door with 12-point locking mechanism.', 'Luxury Openings', true, 'In Stock'),
  ('Aluminium Casement Window (1.2x1.2m)', 'Doors & Windows', 85000, 'Unit', 'https://images.unsplash.com/photo-1503602642458-1428a2a0ff39?w=800&q=80', 'Black powder-coated casement window with 5mm tinted glass and insect net.', 'Crystal Glass & Alum', true, 'In Stock');
