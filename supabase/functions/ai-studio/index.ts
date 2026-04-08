// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { DesignPackage, AgentResponse } from "./schema.ts"

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

        const authHeader = req.headers.get('Authorization');
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized: No Bearer token provided.' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader || '' } }
        })

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (authError || !user) {
            console.error('Auth error:', authError)
            return new Response(JSON.stringify({ error: `Unauthorized: ${authError?.message || 'Invalid session'}` }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log('Authenticated user:', user.id);
        const isAdmin = user.email?.toLowerCase() === 'samuel.edu@aktok.com' || user.user_metadata?.role === 'admin';

        const { prompt, type = 'text', selectedRole = 'Architect' } = await req.json()
        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Fetch user credits
        const { data: profile, error: profileError } = await supabaseClient
            .from('professionals')
            .select('credits')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Profile error:', profileError)
            return new Response(JSON.stringify({ error: 'Professional profile not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const cost = 2;
        if (!isAdmin && profile.credits < cost) {
            return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!openRouterKey) {
            throw new Error('Server configuration error: OpenRouter API key missing')
        }

        // Premium model orchestration strategy
        const textModels = [
            "google/gemini-2.0-flash-001",
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o-mini"
        ];

        const systemPrompt = `You are the lead AEC (Architecture, Engineering, Construction) Intelligence Agent for Genuine Stuffs AI Studio.
Acting as a ${selectedRole}, your goal is to provide engineering-compliant, structurally correct design data.

You MUST respond in two parts:
1. A professional HUMAN-READABLE summary of your design decisions.
2. A technical DATA-BLOCK containing a JSON representation of the design following the DesignPackage schema.

SCHEMA REQUIREMENTS:
- architectural_layout: Array of elements with dimensions (m/mm/ft).
- material_schedule: List of specific materials with estimated quantities.
- structural_skeleton: Basic load-bearing constraints and beam spans.
- compliance: Initial report against building codes (e.g., Nigerian NBC 2024).

FORMAT YOUR DATA BLOCK CLEARLY AS:
<<<DESIGN_DATA_START>>>
{ "project_id": "auto", ... }
<<<DESIGN_DATA_END>>>

Output must be actionable, precise, and professional.`;

        let openRouterResponse: Response | null = null;
        let openRouterData: any = null;
        let result: string | null = null;
        let lastStatus = 500;
        let lastErrorText = "All AI models failed to respond.";

        for (const textModel of textModels) {
            try {
                console.log(`Calling Orchestrator model: ${textModel}...`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "HTTP-Referer": "https://genuinestuffs.com/",
                        "X-Title": "Genuine Stuffs AI Studio",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": textModel,
                        "messages": [
                            { "role": "system", "content": systemPrompt },
                            { "role": "user", "content": prompt }
                        ],
                        "max_tokens": 2000
                    })
                });

                if (response.ok) {
                    openRouterData = await response.json();
                    result = openRouterData.choices?.[0]?.message?.content;
                    if (result) {
                        console.log(`Successfully generated response using ${textModel}`);
                        break;
                    }
                } else {
                    lastStatus = response.status;
                    const errorBody = await response.text();
                    lastErrorText = `AI Provider error (${textModel}): ${response.status} ${response.statusText}. Details: ${errorBody}`;
                    console.error(lastErrorText);
                    
                    // If it's a 401 or 400, it's a config issue, don't waste time on fallbacks
                    if (response.status === 401 || response.status === 400) break;
                }
            } catch (err: any) {
                console.error(`Error attempting model ${textModel}:`, err);
                lastErrorText = `Internal error attempting model ${textModel}: ${err?.message || String(err)}`;
            }
        }

        if (!result) {
            return new Response(JSON.stringify({ 
                error: lastErrorText,
                status: lastStatus
            }), {
                status: lastStatus,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Deduct credits only on success and for non-admins
        if (!isAdmin) {
            await supabaseClient
                .from('professionals')
                .update({ credits: profile.credits - cost })
                .eq('id', user.id)
            console.log('Successfully generated response, credits deducted.');
        } else {
            console.log('Successfully generated response, credit deduction bypassed for admin.');
        }

        return new Response(JSON.stringify({ result, type: 'text' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Function error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: error.status || 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
