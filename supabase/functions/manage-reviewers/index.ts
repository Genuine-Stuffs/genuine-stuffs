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
 * that gives a reviewer AI Studio. The reviewer is then told by email
 * (Resend: RESEND_API_KEY, REVIEWER_EMAIL_FROM) and WhatsApp (Meta Cloud API:
 * WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APPROVAL_TEMPLATE), each
 * only when its secrets are set; a failed notice never undoes the approval.
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

const SITE_URL = () => (Deno.env.get('SITE_URL') ?? 'https://www.genuinestuffs.com').replace(/\/$/, '');

/** A Nigerian or international number as WhatsApp wants it: digits only, with the country code (0803... -> 234803...). */
function whatsappNumber(phone: string): string | null {
    let d = String(phone ?? '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = '234' + d.slice(1);
    if (d.length === 10 && /^[789]/.test(d)) d = '234' + d;
    return d.length >= 10 && d.length <= 15 ? d : null;
}

/** The approval message, the same words on every channel. */
function approvalText(firstName: string, email: string) {
    const login = `${SITE_URL()}/reviewers/login`; // the reviewers' own sign-in, straight to AI Studio
    return {
        subject: 'Your Genuine Stuffs reviewer application is approved',
        text: `Hello ${firstName},\n\nYour reviewer application for Genuine Stuffs AI Studio is approved.\n\nSign in at ${login} with ${email} and the password you chose when you applied (if you were already signed in, sign out and in again). You will go straight to AI Studio.\n\nUnder each design's drawings there is a "Review this design" panel: score it, name the most important fix, and press "Save review".\n\nThank you for being one of our pioneer reviewers.\nGenuine Stuffs`,
        login,
    };
}

type Notice = { sent: boolean; detail: string };

async function emailApproval(to: string, firstName: string): Promise<Notice> {
    const key = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('REVIEWER_EMAIL_FROM');
    if (!key || !from) return { sent: false, detail: 'email not set up (RESEND_API_KEY, REVIEWER_EMAIL_FROM)' };
    const m = approvalText(firstName, to);
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = esc(m.text).split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>').replace(esc(m.login), `<a href="${m.login}">${esc(m.login)}</a>`)}</p>`).join('');
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [to], subject: m.subject, text: m.text, html }),
        });
        return res.ok ? { sent: true, detail: `email sent to ${to}` } : { sent: false, detail: `email failed: ${(await res.text()).slice(0, 200)}` };
    } catch (e: any) {
        return { sent: false, detail: `email failed: ${e.message}` };
    }
}

async function whatsappApproval(phone: string, firstName: string): Promise<Notice> {
    const token = Deno.env.get('WHATSAPP_TOKEN'), phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const template = Deno.env.get('WHATSAPP_APPROVAL_TEMPLATE'), lang = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') ?? 'en';
    if (!token || !phoneId || !template) return { sent: false, detail: 'WhatsApp not set up (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APPROVAL_TEMPLATE)' };
    const to = whatsappNumber(phone);
    if (!to) return { sent: false, detail: `WhatsApp: "${phone}" is not a phone number` };
    try {
        // a business may open a WhatsApp conversation only with a template Meta has approved:
        // its body takes {{1}} the first name and {{2}} the sign-in link
        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp', to, type: 'template',
                template: { name: template, language: { code: lang }, components: [{ type: 'body', parameters: [
                    { type: 'text', text: firstName }, { type: 'text', text: approvalText(firstName, '').login },
                ] }] },
            }),
        });
        return res.ok ? { sent: true, detail: `WhatsApp sent to +${to}` } : { sent: false, detail: `WhatsApp failed: ${(await res.text()).slice(0, 200)}` };
    } catch (e: any) {
        return { sent: false, detail: `WhatsApp failed: ${e.message}` };
    }
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

        // an approved (or restored) reviewer is told at once, by email and WhatsApp
        let notices: { email: Notice; whatsapp: Notice } | null = null;
        if (decision.isReviewer) {
            const first = String(app.other_names || app.full_name || '').trim().split(/\s+/)[0] || 'there';
            const [email, whatsapp] = await Promise.all([emailApproval(app.email, first), whatsappApproval(app.phone, first)]);
            notices = { email, whatsapp };
        }
        return json({ id: app.id, status: decision.status, notices });
    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
})
