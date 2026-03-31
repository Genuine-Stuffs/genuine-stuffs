// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

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

        const { prompt, type = 'text' } = await req.json()
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
        if (profile.credits < cost) {
            return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!openRouterKey) {
            throw new Error('Server configuration error: OpenRouter API key missing')
        }

        console.log('Calling OpenRouter text model...');

        // Confirmed working free model on OpenRouter (meta-llama)
        const textModel = "meta-llama/llama-3.2-3b-instruct:free";

        const systemPrompt = `You are an expert architectural design AI for Genuine Stuffs AI Studio. 
When given a design brief or concept, provide a structured, detailed design analysis with:
1. Design concept overview
2. Key architectural features
3. Material recommendations  
4. Spatial layout suggestions
5. Sustainability considerations
Keep it professional, concise and actionable for a ${user.email || 'professional'}.`;

        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                "max_tokens": 800
            })
        });

        if (!openRouterResponse.ok) {
            const errorBody = await openRouterResponse.text();
            console.error('OpenRouter error body:', errorBody);
            return new Response(JSON.stringify({ 
                error: `AI Provider error: ${openRouterResponse.status} ${openRouterResponse.statusText}`,
                details: errorBody 
            }), {
                status: openRouterResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const openRouterData = await openRouterResponse.json();
        const result = openRouterData.choices?.[0]?.message?.content;

        if (!result) {
            console.error('Empty OpenRouter response:', JSON.stringify(openRouterData));
            return new Response(JSON.stringify({ error: 'AI returned empty response. Please try again.' }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Deduct credits
        await supabaseClient
            .from('professionals')
            .update({ credits: profile.credits - cost })
            .eq('id', user.id)

        console.log('Successfully generated response, credits deducted.');

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
