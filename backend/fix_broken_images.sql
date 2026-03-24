-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This script ensures all product images point to the centrally stored, highly reliable local assets.
-- It fixes any broken external (Unsplash) links that might be causing 404s on the dashboard.

UPDATE materials SET image_url = '/images/materials/cement.png' WHERE name ILIKE '%Portland Cement%';
UPDATE materials SET image_url = '/images/materials/granite.png' WHERE name ILIKE '%Quarry Granite%';
UPDATE materials SET image_url = '/images/materials/steel_rebars.png' WHERE name ILIKE '%Reinforcement Steel%';
UPDATE materials SET image_url = '/images/materials/roofing_sheets.png' WHERE name ILIKE '%Aluminum Roofing%';
UPDATE materials SET image_url = '/images/materials/plumbing_pipes.png' WHERE name ILIKE '%Plumbing Network Pipes%';
UPDATE materials SET image_url = '/images/materials/copper_cables.png' WHERE name ILIKE '%Copper Cable%';
UPDATE materials SET image_url = '/images/materials/granite_slabs.png' WHERE name ILIKE '%Polished Granite Slabs%';
UPDATE materials SET image_url = '/images/materials/tiles.png' WHERE name ILIKE '%Vitrified Floor Tiles%';
UPDATE materials SET image_url = '/images/materials/dulux_paint.png' WHERE name ILIKE '%Premium Wall Paint%';
UPDATE materials SET image_url = '/images/materials/sand.png' WHERE name ILIKE '%Sharp River Sand%';

-- The recently generated ones
UPDATE materials SET image_url = '/images/materials/high_tensile_rebar_y12.png' WHERE name ILIKE '%High-Tensile%';
UPDATE materials SET image_url = '/images/materials/binding_wire_roll.png' WHERE name ILIKE '%Binding Wire%';
UPDATE materials SET image_url = '/images/materials/ppr_pipe_25mm.png' WHERE name ILIKE '%PPR Pipe%';
UPDATE materials SET image_url = '/images/materials/double_bowl_kitchen_sink.png' WHERE name ILIKE '%Kitchen Sink%';
UPDATE materials SET image_url = '/images/materials/armoured_cable_4core.png' WHERE name ILIKE '%Armoured Cable%';
UPDATE materials SET image_url = '/images/materials/led_panel_light_18w.png' WHERE name ILIKE '%LED Panel Light%';
