-- design_events: every plan AI Studio draws, with the words that asked for it
-- (feasibility study §9.1 and §9.3: "real Nigerian users, real prompts, and
-- real edit requests, captured as data" — the Nigerian floor-plan dataset).
-- One row each time a plan is drawn or used: a new design, a follow-up that
-- edits it, a re-plan under another setback law, another layout option
-- picked, or a drawing downloaded. Rows of one conversation share a
-- session_id, so an edit can be read against the design it changed.
--
-- Who may do what (row level security):
--   any signed-in user adds rows for themselves; nobody can change or delete
--   one; admin and PM read all (to study and export them).

CREATE TABLE IF NOT EXISTS design_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id    UUID NOT NULL,            -- one design conversation
    kind          TEXT NOT NULL CHECK (kind IN ('design', 'edit', 'replan', 'option', 'export')),
    detail        TEXT,                     -- export format, the setback law re-planned under, the option number
    prompts       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- the user's messages so far, in order
    building_type TEXT,
    solver_status TEXT,
    plan          JSONB,                    -- brief, setbacks, seed and the solved plan
    app_build     TEXT
);

CREATE INDEX IF NOT EXISTS idx_design_events_created_at ON design_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_events_session ON design_events (session_id, created_at);

ALTER TABLE design_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users add their own design events" ON design_events;
CREATE POLICY "Users add their own design events"
    ON design_events FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin and PM read design events" ON design_events;
CREATE POLICY "Admin and PM read design events"
    ON design_events FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
        OR (auth.jwt() -> 'app_metadata' ->> 'is_pm') = 'true'
    );
