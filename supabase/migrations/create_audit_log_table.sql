-- ============================================================
-- MIGRATION: Create audit_log table
-- Tracks admin/PM environment access and sensitive actions.
-- Every time the CTO or PM enters a privileged environment
-- or impersonates a user type, a row is written here.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email     TEXT        NOT NULL,
    action          TEXT        NOT NULL, -- e.g. 'ENVIRONMENT_ENTERED', 'CLAIM_SET', 'PM_ACCESS'
    environment     TEXT,                 -- e.g. 'admin', 'pm', 'professional', 'vendor', 'client'
    metadata        JSONB       DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookups by actor and time
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id   ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- RLS: Admins can read all logs. No one can delete or update logs (immutable audit trail).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
    );

CREATE POLICY "Authenticated users can insert their own audit logs"
    ON public.audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- No UPDATE or DELETE policies — the audit trail is append-only
COMMENT ON TABLE public.audit_log IS
    'Immutable audit trail for admin/PM environment access and privileged actions.';
