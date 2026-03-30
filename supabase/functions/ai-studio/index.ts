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
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Use standard Supabase Edge Function environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        
        console.log('Function started. Supabase URL check:', !!supabaseUrl);

        const supabaseClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Get the user from the JWT
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        
        if (authError || !user) {
            console.error('Auth User Fetch Error:', authError);
            return new Response(JSON.stringify({ 
                error: 'Unauthorized: Session missing',
                auth_error: authError?.message 
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log('User authenticated as:', user.id);

        // Get the request body
        const { prompt, type = 'image', model } = await req.json()
        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Fetch user profile for credits
        console.log('Fetching profile for user:', user.id)
        const { data: profile, error: profileError } = await supabaseClient
            .from('professionals')
            .select('credits')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Profile Fetch Error:', profileError)
            return new Response(JSON.stringify({ error: `Professional Profile not found` }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const cost = type === 'image' ? 2 : 1
        console.log(`Available credits: ${profile.credits}, Required: ${cost}`)
        
        if (profile.credits < cost) {
            return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // OpenRouter Key validation
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!openRouterKey) {
            console.error('OPENROUTER_API_KEY is missing')
            throw new Error('Server Config Error: API key missing')
        }

        console.log(`Calling OpenRouter for ${type}...`)
        
        // Define model based on type
        const apiModel = type === 'image' 
                        ? (model || "openai/dall-e-3") 
                        : (model || "anthropic/claude-3.5-sonnet")

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "HTTP-Referer": "https://material-insight-pros.netlify.app/",
                "X-Title": "Genuine Stuffs AI Studio",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": apiModel,
                "messages": [
                    { 
                        "role": "system", 
                        "content": type === 'image' 
                                    ? "Produce a detailed prompt for DALL-E." 
                                    : "You are an expert architectural assistant."
                    },
                    { "role": "user", "content": prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter Error:', errorText);
            throw new Error(`AI Provider reported error: ${response.statusText}`);
        }

        const openRouterData = await response.json();
        console.log('OpenRouter Response:', JSON.stringify(openRouterData).substring(0, 100));

        const result = openRouterData.choices?.[0]?.message?.content;
        if (!result) {
            console.error('Empty response from OpenRouter:', openRouterData);
            throw new Error('AI returned an empty response');
        }

        // Deduct credits on success
        console.log('Deducting credits...')
        const { error: updateError } = await supabaseClient
            .from('professionals')
            .update({ credits: profile.credits - cost })
            .eq('id', user.id)

        if (updateError) {
            console.error('Failed to deduct credits:', updateError)
        }

        return new Response(JSON.stringify({ result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Function caught error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
