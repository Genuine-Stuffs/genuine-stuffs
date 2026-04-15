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

        const systemPrompt = `You are the lead AEC (Architecture, Engineering, Construction) Intelligence Agent for Genuine Stuffs AI Studio.
Acting as a ${selectedRole}, your goal is to provide engineering-compliant, structurally correct design data grounded in the Nigerian National Building Code (NBC) 2006.

NIGERIAN BUILDING CODE (NBC) CONSTANTS:
- MIN ROOM SIZES: Bedroom >= 9.0m2 (min width 2.7m), Living >= 12.0m2 (min width 3.0m), Kitchen >= 5.5m2, Dining >= 7.5m2.
- SETBACKS (Lagos Residential): Front: 6.0m, Rear: 3.0m, Sides: 3.0m.
- MATERIALS: 9" block = 10 units/m2, 6" block = 12.5 units/m2.
- CONCRETE MIX: C20 (1:2:4, 7 bags/m3), C25 (1:1.5:3, 8.5 bags/m3).
- STRUCTURAL: Max Beam Span for Residential = 4.5m. Span-to-depth ratio = 15.

PHASE 1: DISCOVERY & FIDELITY CHECK
If the user's prompt is too vague (e.g., "design a house") or lacks critical AEC parameters (dimensions, site conditions, specific material preferences), YOU MUST prioritize discovery.
Set status: "DISCOVERY" and provide 3 clarifying questions.

PHASE 2: PARAMETRIC LAYOUT (SVG)
When generating "READY" designs, you MUST include "svg_path" for each room in architectural_layout. 
- Use a 1m = 20px scale. 
- Example: A 3m x 4m room starting at (0,0) would have svg_path: "M0,0 L80,0 L80,60 L0,60 Z".

DATA BLOCK FORMAT:
<<<DESIGN_DATA_START>>>
{
  "status": "READY | DISCOVERY",
  "project_id": "GS-XXXXX",
  "architectural_layout": [
    { "id": "rm1", "type": "room", "name": "Bedroom 1", "dimensions": {"width": 3, "length": 4, "height": 3, "unit": "m"}, "svg_path": "M...", "notes": "..." }
  ],
  "material_schedule": [...],
  "structural_skeleton": {...},
  "compliance": { "status": "compliant", "checked_against": "NBC 2006", "findings": ["Setbacks verified", "Room areas compliant"] },
  "summary": "...",
  "discovery_questions": ["Question 1", "Question 2", "Question 3"],
  "image_prompt": "..."
}
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
                            ...(history && history.length > 0 ? history : [{ "role": "user", "content": prompt }])
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

        // --- EXTRACT STRUCTURED DATA (Hardened Global Sweep) ---
        let designData = null;
        try {
            // Priority 1: Tag-based extraction
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
                    // If JSON.parse fails, try to strip potential markdown backticks
                    const cleanedJson = jsonText.replace(/^```json\s*|```$/g, "").trim();
                    designData = JSON.parse(cleanedJson);
                }
                // ALWAYS purge the entire block from the user-facing text
                result = result.replace(dataBlockRegex, "").trim();
            }

            // Priority 2: Fallback to markdown code blocks if tags are missing or broken
            if (!designData) {
                const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/gi;
                let cbMatch;
                while ((cbMatch = codeBlockRegex.exec(result)) !== null) {
                    try {
                        const parsed = JSON.parse(cbMatch[1]);
                        if (parsed.status || parsed.architectural_layout) {
                            designData = parsed;
                            result = result.replace(cbMatch[0], "").trim();
                        }
                    } catch (e) {}
                }
            }

             // Final Scrub: Remove any remaining tags that might have been malformed
             result = result.replace(/<<<DESIGN_DATA_(START|END)>>>/gi, "").trim();
        } catch (parseErr) {
            console.error("Critical parsing error:", parseErr);
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
