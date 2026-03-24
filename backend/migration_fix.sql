-- RUN ALL OF THIS IN SUPABASE SQL EDITOR

-- SECTION 1: ADD MISSING COLUMNS
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS personal_street_address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS personal_city TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS personal_state TEXT;
ALTER TABLE vendors ALTER COLUMN address DROP NOT NULL;

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS nationality TEXT;

-- SECTION 2: FORCE CACHE REFRESH
NOTIFY pgrst, 'reload schema';

-- SECTION 3: CLEAN UP TEST DATA (Selective Delete)
-- This deletes all vendors and professionals from the profile tables
DELETE FROM vendors;
DELETE FROM professionals;

-- This deletes their auth accounts from Supabase Auth
-- It selectively targets only those with 'vendor' or 'professional' roles in their metadata
DELETE FROM auth.users WHERE raw_user_meta_data->>'role' IN ('vendor', 'professional');
