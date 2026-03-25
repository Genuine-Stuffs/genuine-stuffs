-- Fix RLS policies to allow public visibility of professionals and vendors
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pxcgatrgtlvxkjwhjcfr/sql

-- 1. Enable RLS for professionals if not already enabled
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing SELECT policies on professionals to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON professionals;

-- 3. Create a policy that allows anyone (even non-logged-in users) to see pro profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON professionals FOR SELECT 
USING (true);

-- 4. Allow professionals to update their own data
DROP POLICY IF EXISTS "Professionals can update their own profile" ON professionals;
CREATE POLICY "Professionals can update their own profile" 
ON professionals FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Ensure vendors are also publicly viewable
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view vendors" ON vendors;
CREATE POLICY "Public can view vendors" 
ON vendors FOR SELECT 
USING (true);

-- 6. Grant SELECT permission to anon and authenticated roles
GRANT SELECT ON professionals TO anon, authenticated;
GRANT SELECT ON vendors TO anon, authenticated;
