-- ============================================================
-- MIGRATION: Add subscription_status column to professionals
-- ============================================================
-- This column is the foundational access control field that
-- gates Pro vs Trial vs Expired user capabilities in the platform.
-- Defined in backend/schema.sql from project inception but was
-- not included in the live Supabase table at creation time.
-- ============================================================

-- Safely add the column (IF NOT EXISTS prevents errors on re-runs)
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IN ('trial', 'active', 'expired'))
    DEFAULT 'trial';

-- Backfill any existing rows that currently have NULL (sets them to 'trial')
UPDATE public.professionals
SET subscription_status = 'trial'
WHERE subscription_status IS NULL;

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.professionals.subscription_status IS
    'Controls user access tier in the AI Studio and platform features. Values: trial | active | expired.';
