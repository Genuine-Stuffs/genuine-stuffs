// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

declare const Deno: any;

/**
 * Genuine Stuffs — manage-reviewers
 * -------------------------------------------------------
 * The admin or PM decides on reviewer applications (reviewer-apply) from
 * /admin/reviews. The caller is checked against the server-side claims in
 * their own login token.
 *
 *   { action: 'list' }                                  applications + last sign-in
 *   { action: 'approve' | 'reject' | 'revoke' | 'restore', id }
 *   { action: 'reset_password', id }                    a one-time password, returned once
 *
 * Approving (or restoring) sets app_metadata.is_reviewer and
 * reviewer_discipline, which the user cannot change; that is the only thing
 * that gives a reviewer AI Studio.
 * -------------------------------------------------------
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

// 14 characters from an alphabet without look-alikes (0/O, 1/l/I)
function oneTimePassword(): string {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(14));
    return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

// what each decision does: the application's new status, and the account's reviewer mark
const DECISIONS: Record<string, { from: string[]; status: string; isReviewer: boolean }> = {
    approve: { from: ['pending', 'rejected'], status: 'approved', isReviewer: true },
    reject: { from: ['pending'], status: 'rejected', isReviewer: false },
    revoke: { from: ['approved'], status: 'ended', isReviewer: false },
    restore: { from: ['ended'], status: 'approved', isReviewer: true },
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ?? '';
        if (!serviceRoleKey) return json({ error: 'Server config error: service role key missing.' }, 500);
        const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

        // Gate: the caller's own token must carry admin or PM claims
        const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
        const { data: authData } = await db.auth.getUser(token);
        const caller = authData?.user;
        if (caller?.app_metadata?.is_admin !== true && caller?.app_metadata?.is_pm !== true) {
            return json({ error: 'Forbidden: only an admin or PM can manage reviewers.' }, 403);
        }

        const body = await req.json();
        const action = String(body?.action ?? '');

        if (action === 'list') {
            const { data: applications, error } = await db.from('reviewer_applications').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            const lastSignIn: Record<string, string | null> = {};
            for (let page = 1; ; page++) {
                const { data, error: listError } = await db.auth.admin.listUsers({ page, perPage: 1000 });
                if (listError) throw listError;
                for (const u of data?.users ?? []) lastSignIn[u.id] = u.last_sign_in_at ?? null;
                if ((data?.users ?? []).length < 1000) break;
            }
            return json({
                applications: (applications ?? []).map((a: any) => ({ ...a, last_sign_in_at: lastSignIn[a.user_id] ?? null })),
                // for the application link the admin shares (/reviewers/apply?code=...)
                invite_code: Deno.env.get('REVIEWER_INVITE_CODE') ?? null,
            });
        }

        const { data: app, error: appError } = await db.from('reviewer_applications').select('*').eq('id', String(body?.id ?? '')).maybeSingle();
        if (appError) throw appError;
        if (!app) return json({ error: 'Application not found.' }, 404);
        const { data: { user }, error: userError } = await db.auth.admin.getUserById(app.user_id);
        if (userError || !user) return json({ error: 'The applicant\'s account no longer exists.' }, 404);

        if (action === 'reset_password') {
            const password = oneTimePassword();
            const { error } = await db.auth.admin.updateUserById(user.id, { password });
            if (error) throw error;
            return json({ email: app.email, password });
        }

        const decision = DECISIONS[action];
        if (!decision) return json({ error: `Unknown action: ${action}` }, 400);
        if (!decision.from.includes(app.status)) return json({ error: `This application is ${app.status}; it cannot be changed that way.` }, 409);

        const { error: updateUserError } = await db.auth.admin.updateUserById(user.id, {
            app_metadata: {
                ...(user.app_metadata ?? {}),
                is_reviewer: decision.isReviewer,
                reviewer_discipline: app.discipline,
                reviewer_status: decision.status,
            },
        });
        if (updateUserError) throw updateUserError;

        const { error: updateAppError } = await db.from('reviewer_applications')
            .update({ status: decision.status, decided_at: new Date().toISOString(), decided_by: caller.id })
            .eq('id', app.id);
        if (updateAppError) throw updateAppError;

        return json({ id: app.id, status: decision.status });
    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
})
