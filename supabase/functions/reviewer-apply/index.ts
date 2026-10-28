// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

declare const Deno: any;

/**
 * Genuine Stuffs — reviewer-apply (public: deploy with --no-verify-jwt)
 * -------------------------------------------------------
 * The onboarding form at /reviewers/apply?code=... sends a hired
 * professional's application here. The code in the link must match the
 * REVIEWER_INVITE_CODE secret; changing that secret closes the old link.
 *
 * A new applicant gets a login with the password they chose but NO AI Studio
 * access (role client, app_metadata.reviewer_status 'pending'). An existing
 * account keeps its password. Either way an application row is written, and
 * only the admin or PM approving it (manage-reviewers) sets is_reviewer.
 * -------------------------------------------------------
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DISCIPLINES = [
    'architect', 'structural_engineer', 'mep_engineer', 'quantity_surveyor',
    'town_planner', 'building_control', 'builder', 'other',
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const text = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max);

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const inviteCode = Deno.env.get('REVIEWER_INVITE_CODE') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ?? '';
        if (!inviteCode || !serviceRoleKey) return json({ error: 'Applications are closed at the moment.' }, 503);

        const body = await req.json();
        if (text(body?.code, 100) !== inviteCode) {
            return json({ error: 'This application link is not valid. Ask for the current link in the reviewers group.' }, 403);
        }
        // a field people never see: only bots fill it in
        if (text(body?.website)) return json({ submitted: true, existing: false });

        const email = text(body?.email, 200).toLowerCase();
        const fullName = text(body?.full_name, 120);
        const phone = text(body?.phone, 40);
        const discipline = text(body?.discipline, 40);
        const password = String(body?.password ?? '');
        const years = Number.parseInt(String(body?.years_experience ?? ''), 10);

        const missing: string[] = [];
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) missing.push('a valid email');
        if (!fullName) missing.push('your full name');
        if (!phone) missing.push('a phone number');
        if (!DISCIPLINES.includes(discipline)) missing.push('your discipline');
        if (missing.length) return json({ error: `Please give ${missing.join(', ')}.` }, 400);

        const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey, { auth: { persistSession: false } });

        // The account: a new one with the chosen password, or the one this email already has
        const [firstName, ...rest] = fullName.split(/\s+/);
        let userId: string;
        let existing = false;
        if (password.length < 8) {
            // only an existing account may apply without a password: check before refusing
            const found = await findByEmail(db, email);
            if (!found) return json({ error: 'Please choose a password of at least 8 characters.' }, 400);
            userId = found.id; existing = true;
        } else {
            const { data, error } = await db.auth.admin.createUser({
                email, password, email_confirm: true,
                user_metadata: { full_name: fullName, first_name: firstName ?? '', last_name: rest.join(' '), role: 'client' },
                app_metadata: { reviewer_status: 'pending' },
            });
            if (data?.user) {
                userId = data.user.id;
            } else {
                const found = await findByEmail(db, email);
                if (!found) return json({ error: `The account could not be created: ${error?.message ?? 'unknown error'}` }, 500);
                userId = found.id; existing = true;
            }
        }

        if (existing) {
            const { data: { user } } = await db.auth.admin.getUserById(userId);
            if (user?.app_metadata?.is_reviewer === true) {
                return json({ error: 'This email is already an approved reviewer: sign in at the login page.' }, 409);
            }
            // the password stays as it is; the account is marked as waiting
            await db.auth.admin.updateUserById(userId, { app_metadata: { ...(user?.app_metadata ?? {}), reviewer_status: 'pending' } });
        }

        const { error: insertError } = await db.from('reviewer_applications').insert({
            user_id: userId,
            email, full_name: fullName, phone, discipline,
            organisation: text(body?.organisation, 200) || null,
            professional_body: text(body?.professional_body, 100) || null,
            registration_number: text(body?.registration_number, 100) || null,
            years_experience: Number.isFinite(years) && years >= 0 && years < 80 ? years : null,
            location: text(body?.location, 120) || null,
            portfolio_url: text(body?.portfolio_url, 300) || null,
            note: text(body?.note, 2000) || null,
        });
        if (insertError) {
            // the unique index allows one open application per person
            if (insertError.code === '23505') return json({ error: 'You have already applied. Your application is waiting for approval.' }, 409);
            return json({ error: `The application could not be saved: ${insertError.message}` }, 500);
        }

        return json({ submitted: true, existing });
    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
})

// The admin API has no reliable email filter: look through the accounts page by page
async function findByEmail(db: any, email: string) {
    for (let page = 1; ; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const users = data?.users ?? [];
        const hit = users.find((u: any) => (u.email ?? '').toLowerCase() === email);
        if (hit || users.length < 1000) return hit ?? null;
    }
}
