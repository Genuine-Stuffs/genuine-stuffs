// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

/**
 * Genuine Stuffs — set-admin-claims
 * -------------------------------------------------------
 * ONE-TIME Bootstrap Edge Function.
 * 
 * Sets app_metadata claims on the two co-founder accounts:
 *   samuel.edu@aktok.com        → is_admin: true
 *   genuinestuffs4u@gmail.com   → is_pm: true
 *
 * This function is protected by a BOOTSTRAP_SECRET environment variable.
 * To invoke it from Supabase Dashboard → Edge Functions → Invoke:
 * 
 *   POST body:  { "secret": "<value of BOOTSTRAP_SECRET>" }
 *
 * The function is idempotent — safe to run multiple times.
 * After successful invocation, both accounts carry their claims
 * permanently in every JWT they receive.
 * -------------------------------------------------------
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json();
        const providedSecret = body?.secret;

        // Gate: only allow if caller knows the bootstrap secret
        const bootstrapSecret = Deno.env.get('BOOTSTRAP_SECRET');
        if (!bootstrapSecret || providedSecret !== bootstrapSecret) {
            return new Response(JSON.stringify({ error: 'Forbidden: invalid bootstrap secret.' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? ''; // Auto-injected by Supabase
        const serviceRoleKey = Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ?? '';

        if (!serviceRoleKey) {
            return new Response(JSON.stringify({ error: 'Server config error: ADMIN_SERVICE_ROLE_KEY missing.' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const results: Record<string, any> = {};

        // ── Helper: find user by email, then update app_metadata ──────────────
        async function setClaimForEmail(email: string, claim: Record<string, boolean>) {
            // 1. Look up the user ID from the admin auth API
            const listRes = await fetch(
                `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
                {
                    headers: {
                        'apikey': serviceRoleKey,
                        'Authorization': `Bearer ${serviceRoleKey}`,
                    }
                }
            );

            if (!listRes.ok) {
                const err = await listRes.text();
                return { error: `Failed to look up ${email}: ${err}` };
            }

            const listData = await listRes.json();
            const users = listData.users ?? [];

            if (users.length === 0) {
                return { error: `No user found with email: ${email}` };
            }

            const userId = users[0].id;
            const existingMeta = users[0].app_metadata ?? {};

            // 2. Merge the new claim into existing app_metadata (preserves other fields)
            const updatedMeta = { ...existingMeta, ...claim };

            // 3. PATCH the user's app_metadata via Admin API
            const updateRes = await fetch(
                `${supabaseUrl}/auth/v1/admin/users/${userId}`,
                {
                    method: 'PUT',
                    headers: {
                        'apikey': serviceRoleKey,
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ app_metadata: updatedMeta })
                }
            );

            if (!updateRes.ok) {
                const err = await updateRes.text();
                return { error: `Failed to update ${email}: ${err}` };
            }

            return { success: true, userId, claimsSet: claim };
        }

        // ── Set is_admin for CTO ──────────────────────────────────────────────
        results['samuel.edu@aktok.com'] = await setClaimForEmail(
            'samuel.edu@aktok.com',
            { is_admin: true }
        );

        // ── Set is_pm for non-technical co-owner ─────────────────────────────
        results['genuinestuffs4u@gmail.com'] = await setClaimForEmail(
            'genuinestuffs4u@gmail.com',
            { is_pm: true }
        );

        const allSuccess = Object.values(results).every((r: any) => r.success);

        return new Response(
            JSON.stringify({
                message: allSuccess
                    ? 'Claims set successfully. Both accounts will receive updated JWTs on next sign-in.'
                    : 'Partial success — check results for errors.',
                results
            }),
            {
                status: allSuccess ? 200 : 207,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
})
