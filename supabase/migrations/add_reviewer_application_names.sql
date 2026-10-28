-- reviewer_applications: the applicant's name as two fields, surname and
-- other names (owner 2026-10-28: the standard for every form that asks a
-- name). full_name stays, written as "Other names Surname" for display.

ALTER TABLE reviewer_applications
    ADD COLUMN IF NOT EXISTS surname     TEXT,
    ADD COLUMN IF NOT EXISTS other_names TEXT;
