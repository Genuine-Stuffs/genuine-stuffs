-- audit_log: tracks all significant actions in the platform
-- actor_id is nullable to support system-generated events

ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS resource_type TEXT,
    ADD COLUMN IF NOT EXISTS resource_id   TEXT,
    ADD COLUMN IF NOT EXISTS ip_address    INET;

ALTER TABLE audit_log
    ALTER COLUMN actor_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id
    ON audit_log (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
    ON audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
    ON audit_log (resource_type, resource_id);
