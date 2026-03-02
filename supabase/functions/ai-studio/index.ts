import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Get the user from the JWT
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        // Get the request body
        const { prompt, type = 'image', model } = await req.json()

        // Check credits
        const { data: profile, error: profileError } = await supabaseClient
            .from('professionals')
            .select('credits')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            throw new Error('Profile not found')
        }

        const cost = type === 'image' ? 2 : 1
        if (profile.credits < cost) {
            return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Call OpenRouter
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!openRouterKey) {
            throw new Error('OpenRouter API key not configured')
        }

        let result;
        if (type === 'image') {
            // For images, we use a model that supports image generation if available through OpenRouter
            // Note: OpenRouter primarily handles text models, but some providers offer image gen via chat endpoints
            // or we can fallback to DALL-E directly if needed. 
            // For this implementation, we'll assume a capable image model via OpenRouter or provide a clear error.

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "HTTP-Referer": "https://material-insight-pros.netlify.app/",
                    "X-Title": "Genuine Stuffs AI Studio",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": model || "openai/dall-e-3", // OpenRouter supports DALL-E 3
                    "messages": [
                        { "role": "user", "content": prompt }
                    ]
                })
            });

            const data = await response.json();
            result = data.choices[0]?.message?.content || data.error?.message;

            // If it's DALL-E 3 via OpenRouter, it usually returns a URL or base64 in the content if configured, 
            // or we might need to use a specific image endpoint if OpenRouter provides one.
        } else {
            // Text generation (BoQ, Load Estimation)
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "HTTP-Referer": "https://material-insight-pros.netlify.app/",
                    "X-Title": "Genuine Stuffs AI Studio",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": model || "anthropic/claude-3.5-sonnet",
                    "messages": [
                        { "role": "system", "content": "You are an expert architectural and construction AI assistant for Genuine Stuffs." },
                        { "role": "user", "content": prompt }
                    ]
                })
            });

            const data = await response.json();
            result = data.choices[0]?.message?.content;
        }

        // Deduct credits on success
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

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
