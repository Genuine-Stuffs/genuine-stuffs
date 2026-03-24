-- RUN THIS IN THE SUPABASE SQL EDITOR
-- This script assigns all current products (materials) to the most recently registered vendor.

UPDATE materials
SET 
    vendor_id = v.id,
    vendor_name = v.company_name
FROM (
    SELECT id, company_name 
    FROM vendors 
    ORDER BY created_at DESC 
    LIMIT 1
) v;

-- Verify the update
SELECT name, vendor_name, vendor_id FROM materials;
