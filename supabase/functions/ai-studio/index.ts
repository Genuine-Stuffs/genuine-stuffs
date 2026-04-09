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

        // --- NEW: DEDICATED VISUALIZATION MODE (PATH 3) ---
        if (type === 'visualize') {
            console.log("Generating specialized visualization Agent...");
            const modelToUse = "google/imagen-3"; // High consistency for architectural renders
            try {
                const imageResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "HTTP-Referer": "https://genuinestuffs.com/",
                        "X-Title": "Genuine Stuffs AI Studio",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": modelToUse, 
                        "messages": [
                            { "role": "user", "content": prompt }
                        ]
                    })
                });

                if (imageResponse.ok) {
                    const imageData = await imageResponse.json();
                    let imgUrl = imageData.data?.[0]?.url || 
                                 imageData.choices?.[0]?.message?.content || 
                                 imageData.url;
                                 
                    if (imgUrl && typeof imgUrl === 'string') {
                        const match = imgUrl.match(/https?:\/\/[^\s"'<>|]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif)?/i);
                        if (match) imgUrl = match[0];
                    }

                    return new Response(JSON.stringify({ imageUrl: imgUrl }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                throw new Error(`Visualizer service (${modelToUse}) failed`);
            } catch (err: any) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
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

        if (!openRouterKey) {
            throw new Error('Server configuration error: OpenRouter API key missing')
        }

        // Premium model orchestration strategy
        const textModels = [
            "anthropic/claude-3-5-sonnet",
            "google/gemini-2.0-flash-001",
            "openai/gpt-4o"
        ];

        const systemPrompt = `You are the lead AEC (Architecture, Engineering, Construction) Intelligence Agent for Genuine Stuffs AI Studio.
Acting as a ${selectedRole}, your goal is to provide engineering-compliant, structurally correct design data.

CRITICAL INSTRUCTIONS:
1. DO NOT simply repeat the user's prompt. You must provide a NEW analysis.
2. YOU MUST respond in two distinct sections:
   - PART 1: A professional, human-readable architectural and engineering narrative.
   - PART 2: A highly technical JSON data block wrapped in specific markers.

JSON SCHEMA EXPECTATIONS (DesignPackage):
- architectural_layout: Array of objects { id, type, name, dimensions: { width, length, height, unit } }.
- material_schedule: Array of objects { id, category, specification, quantity_estimate, unit }.
- structural_skeleton: { load_bearing_points, beam_span_max, footing_type, risk_factors }.
- compliance: { status: 'compliant'|'warning', checked_against, findings, recommendations }.

<<<DESIGN_DATA_START>>>
{
  "project_id": "GS-${Math.random().toString(36).substr(2, 5).toUpperCase()}",
  "version": "1.0.0",
  "architectural_layout": [...],
  "material_schedule": [...],
  "structural_skeleton": {...},
  "compliance": {...},
  "summary": "Detailed technical summary here...",
  "image_prompt": "A specialized, technical prompt for an architectural render of this specific design"
}
<<<DESIGN_DATA_END>>>

Output must be actionable, precise, and professional. Ensure all dimensions and quantities are realistic for the design requested.`;

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
                        "temperature": 0.3, // Lower temperature for more consistent JSON
                        "max_tokens": 3000
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

        // --- EXTRACT STRUCTURED DATA ---
        let designData = null;
        try {
            const startMarker = "<<<DESIGN_DATA_START>>>";
            const endMarker = "<<<DESIGN_DATA_END>>>";
            const startIndex = result.indexOf(startMarker);
            const endIndex = result.indexOf(endMarker);

            if (startIndex !== -1 && endIndex !== -1) {
                const jsonText = result.substring(startIndex + startMarker.length, endIndex).trim();
                designData = JSON.parse(jsonText);
                
                // Strip the technical data block from the user-facing text for a cleaner UI
                result = result.replace(result.substring(startIndex, endIndex + endMarker.length), "").trim();
            } else {
                // FALLBACK: Try to find any JSON-like block in the text
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        designData = JSON.parse(jsonMatch[0]);
                        console.log("Fallback JSON extraction success.");
                    } catch (e) {
                        console.log("Fallback JSON extraction failed.");
                    }
                }
            }
        } catch (parseErr) {
            console.error("Failed to parse AEC design data block:", parseErr);
        }

        // --- VISUALIZATION (MOVED TO PATH 3 DECOUPLED MODE) ---
        let imageUrl = null;

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

        return new Response(JSON.stringify({ 
            result, 
            data: designData,
            imageUrl,
            type: 'text' 
        }), {
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
