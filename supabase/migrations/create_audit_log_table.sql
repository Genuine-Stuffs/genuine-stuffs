-- ============================================================
-- MIGRATION: Create audit_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: user deletion won't break the trail
    actor_email     TEXT        NOT NULL,
    action          TEXT        NOT NULL,
    environment     TEXT,
    metadata        JSONB       DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id   ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

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
    WITH CHECK (
        actor_id = auth.uid()
        AND actor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

COMMENT ON TABLE public.audit_log IS
    'Immutable audit trail for admin/PM environment access and privileged actions.';
