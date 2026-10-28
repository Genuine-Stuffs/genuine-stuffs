-- design_reviews: scored feedback from hired professionals (architects,
-- structural engineers, ...) on the plans AI Studio draws. Each row keeps the
-- prompt, the brief and the plan exactly as the reviewer saw them, so a
-- finding can be reproduced and measured against.
--
-- Who may do what (row level security):
--   reviewers (app_metadata.is_reviewer, set only by the manage-reviewers
--   function) add reviews and read their own; admin and PM read all.
-- app_metadata cannot be changed by the user, so nobody can make themselves a reviewer.

CREATE TABLE IF NOT EXISTS design_reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewer_email TEXT,
    discipline    TEXT,                 -- architect, structural_engineer, ...
    verdict       TEXT NOT NULL CHECK (verdict IN ('site_ready', 'minor_fixes', 'major_revision', 'not_usable')),
    scores        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { criterion: 1-5 | null (not assessed) }
    top_issue     TEXT,
    comments      TEXT,
    prompts       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- the user's messages, in order
    building_type TEXT,
    solver_status TEXT,
    plan          JSONB,                -- brief, setbacks, seed and the solved plan shown
    app_build     TEXT                  -- the site build the reviewer was on
);

CREATE INDEX IF NOT EXISTS idx_design_reviews_created_at ON design_reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_reviews_reviewer ON design_reviews (reviewer_id);

ALTER TABLE design_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviewers add their own reviews" ON design_reviews;
CREATE POLICY "Reviewers add their own reviews"
    ON design_reviews FOR INSERT TO authenticated
    WITH CHECK (
        reviewer_id = auth.uid()
        AND (
            (auth.jwt() -> 'app_metadata' ->> 'is_reviewer') = 'true'
            OR (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
        )
    );

DROP POLICY IF EXISTS "Reviewers read their own reviews; admin and PM read all" ON design_reviews;
CREATE POLICY "Reviewers read their own reviews; admin and PM read all"
    ON design_reviews FOR SELECT TO authenticated
    USING (
        reviewer_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
        OR (auth.jwt() -> 'app_metadata' ->> 'is_pm') = 'true'
    );

-- reviewer_applications: the onboarding form (/reviewers/apply) a professional
-- fills in from the link shared with reviewers. Submitting creates their login
-- with no AI Studio access; the admin or PM approves or rejects it on
-- /admin/reviews, and only approval sets app_metadata.is_reviewer.
-- Rows are written only by the reviewer-apply and manage-reviewers functions
-- (service role), so there is no insert or update policy.

CREATE TABLE IF NOT EXISTS reviewer_applications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email               TEXT NOT NULL,
    full_name           TEXT NOT NULL,
    phone               TEXT NOT NULL,
    discipline          TEXT NOT NULL,
    organisation        TEXT,
    professional_body   TEXT,           -- ARCON, COREN, NIQS, NITP, ...
    registration_number TEXT,
    years_experience    INTEGER,
    location            TEXT,
    portfolio_url       TEXT,
    note                TEXT,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ended')),
    decided_at          TIMESTAMPTZ,
    decided_by          UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_reviewer_applications_created_at ON reviewer_applications (created_at DESC);
-- one open application per person
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviewer_applications_one_pending
    ON reviewer_applications (user_id) WHERE status = 'pending';

ALTER TABLE reviewer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants read their own; admin and PM read all" ON reviewer_applications;
CREATE POLICY "Applicants read their own; admin and PM read all"
    ON reviewer_applications FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
        OR (auth.jwt() -> 'app_metadata' ->> 'is_pm') = 'true'
    );
