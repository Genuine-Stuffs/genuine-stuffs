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
        console.log('Fetching profile for user:', user.id)
        const { data: profile, error: profileError } = await supabaseClient
            .from('professionals')
            .select('credits')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            console.error('Profile error:', profileError)
            throw new Error(`Profile not found: ${profileError?.message || 'Unknown error'}`)
        }

        const cost = type === 'image' ? 2 : 1
        console.log(`Available credits: ${profile.credits}, Required: ${cost}`)
        
        if (profile.credits < cost) {
            return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Call OpenRouter
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!openRouterKey) {
            console.error('OPENROUTER_API_KEY is missing')
            throw new Error('Internal Configuration Error: API key missing')
        }

        console.log(`Calling OpenRouter for ${type} with prompt: ${prompt.substring(0, 50)}...`)
        
        let result;
        if (type === 'image') {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "HTTP-Referer": "https://material-insight-pros.netlify.app/",
                    "X-Title": "Genuine Stuffs AI Studio",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": model || "openai/dall-e-3",
                    "messages": [
                        { "role": "user", "content": prompt }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('OpenRouter Image Error:', errorData);
                throw new Error(`AI Generation failed: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('OpenRouter Response Data:', JSON.stringify(data).substring(0, 200))
            result = data.choices[0]?.message?.content || data.error?.message;
            
            if (!result) {
                console.error('No result in OpenRouter response:', data);
                throw new Error('AI returned an empty response');
            }
        } else {
            // Text generation
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

            if (!response.ok) {
                const errorData = await response.text();
                console.error('OpenRouter Text Error:', errorData);
                throw new Error(`AI Text generation failed: ${response.statusText}`);
            }

            const data = await response.json();
            result = data.choices[0]?.message?.content;
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
        console.error('Function catch error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
