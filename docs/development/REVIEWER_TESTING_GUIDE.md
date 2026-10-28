# Design reviewers: onboarding hired professionals

Architects, structural engineers and other professionals apply through a link shared in the reviewers' WhatsApp group. Nobody gets AI Studio until the admin approves their application. Approved reviewers try the five benchmark briefs (or their own projects) and score each design against real-world practice. Every review is saved with the prompt, the brief, the seed and the exact plan they saw, so any finding can be redrawn and fixed.

## How it works

1. **The link:** `https://www.genuinestuffs.com/reviewers/apply?code=<REVIEWER_INVITE_CODE>`. It opens the onboarding form. A link without the right code is refused. Changing the `REVIEWER_INVITE_CODE` secret closes the old link and needs a new one shared.
2. **The form:** name, email, WhatsApp phone, discipline, professional body and registration number, years in practice, city, firm, portfolio link, a note, and a password the applicant chooses. They accept a confidentiality term.
3. **On submit:** a login is created with their password but **no AI Studio access**. If the email already has an account, it keeps its own password. The application waits on the admin page. If they sign in before approval, they are told it is still waiting.
4. **The admin decides:** Admin home → **Design Reviewers** (the card shows how many applications are waiting) → **Approve** or **Reject**. Approving is the only thing that grants AI Studio (`app_metadata.is_reviewer`, which no user can set for themselves). The page then shows an approval message to copy and send.
5. **Reviewing:** the reviewer signs in at `/login` and lands in AI Studio, with no credit limit and PDF/DXF downloads. Under each design's drawings is **Review this design**: 10 criteria scored 1–5 or N/A, an overall verdict, the most important fix, comments, and **Save review**.

## What was built

| Piece | File |
|---|---|
| Tables `design_reviews` and `reviewer_applications`, with their access rules | `supabase/migrations/create_design_reviews_table.sql` |
| Public form handler: checks the link code, creates the login with no access, records the application | `supabase/functions/reviewer-apply/index.ts` |
| Admin/PM-only decisions: list, approve, reject, end access, restore, new password | `supabase/functions/manage-reviewers/index.ts` |
| The onboarding form, `/reviewers/apply` | `src/pages/ReviewerApply.tsx` |
| The admin page, `/admin/reviews`: link, applications, reviews, downloads | `src/pages/DesignReviews.tsx` |
| The review panel in AI Studio | `src/components/review/DesignReviewPanel.tsx` |
| Reviewer mark and sign-in routing | `src/context/AuthContext.tsx`, `src/pages/Login.tsx`, `src/pages/AdminHome.tsx` |

## What you need to do, once

1. **Create the tables.** Supabase dashboard for project `pxcgatrgtlvxkjwhjcfr` → SQL Editor → New query, paste all of `supabase/migrations/create_design_reviews_table.sql`, press Run. Expect "Success. No rows returned".
2. **Set the link code** (it is saved on the dev server in `/root/.config/genuine-stuffs/reviewer-invite.env`):
   `npx supabase secrets set REVIEWER_INVITE_CODE=<the code> --project-ref pxcgatrgtlvxkjwhjcfr`
3. **Deploy the two functions.** The form is used before anyone signs in, so its function takes no login token:
   `npx supabase functions deploy reviewer-apply --no-verify-jwt --project-ref pxcgatrgtlvxkjwhjcfr`
   `npx supabase functions deploy manage-reviewers --project-ref pxcgatrgtlvxkjwhjcfr`
   No other secrets are needed: Supabase gives each function its own service key.
4. **Put the site changes live:** approve the commit and the push to `main` (pushing `main` deploys the site).
5. **Test it yourself:** open the link in a private window, apply with a second email, approve it on Design Reviewers, sign in as that person, and save a review. Your admin account also sees the review panel.
6. **Share the link** in the WhatsApp group. The Design Reviewers page always shows the current link with a **Copy link** button.

## Before you approve

Anyone with the link can apply, and the form doesn't prove that the applicant owns the email they typed. Check each applicant before approving: their registration number with ARCON, COREN, QSRBN, TOPREC or CORBON, and a quick WhatsApp message to the number they gave.

## How you receive the feedback

- **On the page:** `/admin/reviews` lists every review, newest first. Click one for the full prompt, every score, the comments, and the plan's seed and engine mode. The top shows the average score per criterion and the count for each verdict. Each application shows how many reviews that person has saved and when they last signed in.
- **Spreadsheet:** **Spreadsheet (.csv)** downloads one row per review (scores, verdict, comments, seed, first prompt). It opens in Excel or Google Sheets.
- **With the plans:** **With plans (.json)** downloads everything, including the plan each reviewer saw. Hand this file to Claude in a session: the seed and brief redraw each plan exactly, so a finding can become a measured fix.
- **In the database:** Supabase → Table Editor → `design_reviews` and `reviewer_applications`.

## Ending an engagement

**End access** on the person's application. Their reviews stay, and they lose AI Studio when their login token renews, within about an hour, or at once if they sign out. **Restore** gives access back. **New password** shows a one-time password to send them if they forget theirs.

## Limits worth knowing

- An account that existed before applying keeps its own role. If it was already a professional account, it still has AI Studio after **End access**, as any professional does.
- Anyone can still sign up on `/register` as a professional and use AI Studio, as today. The review panel appears only for approved reviewers and the admin.
- The saved plan is the layout option on screen when the review is saved.
