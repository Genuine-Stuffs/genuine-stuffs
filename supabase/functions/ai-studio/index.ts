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

/**
 * Exponential Backoff Utility
 * Retries on 429 (Rate Limit) or 5xx (Server Error)
 */
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            
            // Do NOT retry on 400, 401, 403, 404 (Config/Auth issues)
            if (response.status !== 429 && response.status < 500) return response;

            const delay = Math.pow(2, i) * 1000;
            console.warn(`[Retry ${i+1}/${maxRetries}] AI Provider busy (${response.status}). Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        } catch (err) {
            lastError = err;
            const delay = Math.pow(2, i) * 1000;
            console.warn(`[Retry ${i+1}/${maxRetries}] Network error. Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError || new Error("Max retries exceeded");
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

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
        if (!openRouterKey) {
            return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY is not defined in Supabase Secrets' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { prompt, messages: history = [], type = 'text', selectedRole = 'Architect' } = await req.json()
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

        const systemPrompt = `You are the Lead Executive Architect for Genuine Stuffs AI AEC Studio.
Your mission is to deliver high-fidelity, standards-compliant architectural design intents.

═══════════════════════════════════════════════
THE EXECUTIVE PROTOCOL (MANDATORY)
═══════════════════════════════════════════════
1. ZERO-CODE SPEECH: Never output raw JSON, code snippets, or technical markers in your visible text response. Speak ONLY as a professional Architect would to a client.
2. DELIMITER TAGS: All structural design data (JSON) MUST be wrapped in <<<DESIGN_DATA_START>>> and <<<DESIGN_DATA_END>>>. The user will NEVER see what is inside these tags.
3. PERSONALITY: You are authoritative, concise, and focused on design excellence.
4. NIGERIAN CONTEXT: All designs must comply with the Nigerian National Building Code (NBC) 2006 and tropical bioclimatic design principles.

═══════════════════════════════════════════════
SPACE PLANNING PRINCIPLES
═══════════════════════════════════════════════
- BEDROOM SUITE: Every bedroom MUST be connected to its own convenience (WC/Bath).
- SOCIAL FLOW: Living → Dining → Kitchen must form a logical social sequence.
- NBC STANDARDS: Min Room Sizes: Bedroom >= 9m2, Living >= 12m2, Kitchen >= 5.5m2.

═══════════════════════════════════════════════
DATA BLOCK FORMAT (SPATIAL PROGRAM ONLY)
═══════════════════════════════════════════════
You must output a "SpatialProgram" defining the intent (NOT geometry). The client-side solver will handle geometry.

<<<DESIGN_DATA_START>>>
{
  "brief_reference": {
    "plot_size_sqm": 450,
    "plot_orientation": "N",
    "storeys": 1,
    "budget_band": "mid",
    "style_preference": "contemporary",
    "target_occupancy": 5
  },
  "rooms": [
    {
      "id": "living_1",
      "type": "living",
      "name": "Main Living Area",
      "min_area_sqm": 24,
      "requires_plumbing": false,
      "required_adjacencies": ["kitchen_1", "bed_master"]
    }
  ],
  "total_target_area_sqm": 120
}
<<<DESIGN_DATA_END>>>`;

        let openRouterResponse: Response | null = null;
        let openRouterData: any = null;
        let result: string | null = null;
        let lastStatus = 500;
        let lastErrorText = "All AI models failed to respond.";

        for (const textModel of textModels) {
            try {
                console.log(`Calling Orchestrator model: ${textModel}...`);
                const response = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
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
                            ...(history && history.length > 0 ? history : [{ "role": "user", "content": prompt }])
                        ],
                        "temperature": 0.2, // Very low for strict protocol adherence
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

        // --- HARDENED EXECUTIVE DATA EXTRACTION ---
        let designData = null;
        try {
            const dataBlockRegex = /<<<DESIGN_DATA_START>>>[\s\S]*?<<<DESIGN_DATA_END>>>/gi;
            const match = result.match(dataBlockRegex);

            if (match) {
                const jsonText = match[0]
                    .replace(/<<<DESIGN_DATA_START>>>/i, "")
                    .replace(/<<<DESIGN_DATA_END>>>/i, "")
                    .trim();
                
                try {
                    designData = JSON.parse(jsonText);
                } catch (e) {
                    const cleanedJson = jsonText.replace(/^```json\s*|```$/g, "").trim();
                    designData = JSON.parse(cleanedJson);
                }
                // COMPLETELY SCRUB JSON FROM USER CHAT
                result = result.replace(dataBlockRegex, "").trim();
            }

             // FINAL FIREWALL: Remove any loose tags or JSON blocks leaking into text
             result = result.replace(/<<<DESIGN_DATA_(START|END)>>>/gi, "");
             result = result.replace(/```json[\s\S]*?```/gi, "");
             result = result.trim();
        } catch (parseErr) {
            console.error("Executive Parser Warning:", parseErr);
        }

        // Deduct credits only on success and for non-admins
        if (!isAdmin) {
            await supabaseClient
                .from('professionals')
                .update({ credits: profile.credits - cost })
                .eq('id', user.id)
            console.log('Successfully generated response, credits deducted.');
        }

        return new Response(JSON.stringify({ 
            result: result || "Conceptual model generated. Please see the visual dashboard for structural details.", 
            data: designData,
            imageUrl: null,
            type: 'text' 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Executive Node Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: error.status || 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
