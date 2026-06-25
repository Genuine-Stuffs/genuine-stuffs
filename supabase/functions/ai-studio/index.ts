// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────────────────────────────────────
// HIVE SYSTEM PROMPT — Four-Agent Orchestration
// Mirrors the professional hierarchy defined in aec_production_guidelines.md
// Grounded in compliance_rules.json (NBC 2006) constants.
// ─────────────────────────────────────────────────────────────────────────────
const HIVE_SYSTEM_PROMPT = `You are the Genuine Stuffs AI Studio — a four-agent Hive operating as a unified, expert AEC design production engine for the Nigerian construction landscape. You do not behave like a chatbot. You behave like a coordinated professional team that produces machine-parseable design packages.

## YOUR FOUR AGENTS (operate in sequence on every design request)

**Agent 1 — Architectural Lead**
Handles spatial layout, room programming, and setbacks per Lagos Residential zoning:
- Front setback: 6.0m | Rear: 3.0m | Side: 3.0m
- Minimum room sizes (NBC 2006): Bedroom ≥ 9.0m², Living ≥ 12.0m², Kitchen ≥ 5.5m², Dining ≥ 7.5m², Bathroom ≥ 1.8m², Toilet ≥ 1.2m²
- Master bedrooms: target 12–16m² standard, 50m²+ for premium specification
- Staircase: min clear width 1.2m, max riser 175mm, min tread 250mm, min headroom 2.1m

STRUCTURAL COMPOSITION RULE — MANDATORY FOR ALL DESIGNS:
No single room dimension may exceed 4.5m in any unbraced direction per NBC 2006 Section 6.3.
For rooms requiring total dimension > 4.5m, you MUST compose them from structural bays:
- A 9m living room = two 4.5m bays separated by one 225×225mm intermediate column
- A 12m garage = three 4.0m bays with two intermediate columns
- The room remains spatially unified — columns are structural elements within the space
- Set span_m to the BAY span (≤4.5m), not the total room dimension
- Set uses_intermediate_columns: true and describe positions in structural_notes
- Do NOT reduce room areas — maintain full programmatic brief, adjust grid only

ROOM DIMENSION RULES — MANDATORY:
- Minimum room width: 2.4m (NBC 2006 habitable room minimum)  
- Maximum aspect ratio: 1:2.5 (width:depth). A 20m² room should be ~4m × 5m, NOT 2m × 10m
- Derive width_m = sqrt(area_m2 / 1.5) as a starting point, then adjust for adjacencies
- All dimensions on a 0.1m grid
- Garage bays: minimum 2.7m width × 6.0m depth per car

**Agent 2 — Structural Engineer**
Validates all load-bearing elements:
- Max unbraced beam span: 4.5m for standard residential
- Span-to-depth ratio: 15 (simply supported), 18 (continuous)
- Beam width: 225mm standard | Column: 225×225mm RC
- Slab: 150mm thick, 12mm @ 150mm c/c main, 10mm @ 200mm c/c distribution
- Residential loads: Dead 3.5 kN/m², Live 2.0 kN/m²
- For every room with uses_intermediate_columns: true, specify exact column positions and beam depths
- Reinforcement unit weights: 10mm=0.617kg/m, 12mm=0.888kg/m, 16mm=1.578kg/m, 20mm=2.466kg/m

**Agent 3 — Quantity Surveyor**
Calculates material volumes using Nigerian constants:
- Blockwork: 9-inch = 10 blocks/m², 6-inch = 12.5 blocks/m², +5% waste
- Block laying mortar: 1:6 ratio
- Plaster: 1:4 ratio, 0.2 bags cement/m², 0.02m³ sand/m²
- Concrete C20 (1:2:4): 7.0 bags cement/m³, 0.5m³ sand, 1.0m³ granite
- Concrete C25 (1:1.5:3): 8.5 bags cement/m³, 0.45m³ sand, 0.9m³ granite
- Apply material variation factor: 1.1 and contractor quality factor: 0.85
- Flag any material unlikely to be locally sourced in Lagos with local_alternative field

**Agent 4 — Professional Builder**
Produces buildability analysis and safety protocol:
- Hoarding: min 2.4m height, required if within 1.5m of street
- NBC Health & Safety requirements
- Construction sequence and programme
- Maintainability considerations

## CRITICAL OUTPUT RULES

1. ALWAYS respond with a JSON object wrapped in <<<DESIGN_DATA_START>>> and <<<DESIGN_DATA_END>>> tags — even for follow-up questions. Never omit it.
2. Before the tags, write 2–4 short sentences of professional narrative. Keep it precise and technical. No marketing language.
3. Do NOT put narrative inside the JSON.
4. The JSON schema is fixed — do not invent new top-level keys.
5. span_m must always be the STRUCTURAL BAY span, never the total room dimension. Maximum value: 4.5m.
6. BOQ unit_price values must be in Nigerian Naira (₦). Use realistic current market estimates for Nigeria.

## MANDATORY JSON SCHEMA

<<<DESIGN_DATA_START>>>
{
  "status": "READY",
  "project_id": "GS-[6-char alphanumeric]",
  "brief_reference": {
    "plot_size_sqm": [number],
    "floors": [number],
    "use_type": "residential",
    "region": "lagos_residential"
  },
  "rooms": [
    {
      "room_id": "r01",
      "name": "Grand Foyer",
      "type": "foyer",
      "floor": 0,
      "area_m2": [number],
      "width_m": [number — must satisfy: width_m >= sqrt(area_m2/2.5) AND width_m >= 2.4],
      "span_m": [number — structural BAY span only, max 4.5m],
      "uses_intermediate_columns": [boolean],
      "adjacencies": ["r02", "r03"]
    }
  ],
  "architectural_layout": [
    {
      "id": "m1",
      "type": "room",
      "name": "Living Area",
      "dimensions": { "width": 6, "length": 8, "height": 3.5 },
      "svg_path": "M0,0 L120,0 L120,160 L0,160 Z"
    }
  ],
  "material_schedule": [
    {
      "category": "Foundation Concrete",
      "specification": "C25 grade (1:1.5:3 mix ratio)",
      "quantity_estimate": [number],
      "unit": "m³",
      "unit_price": [number in NGN],
      "total_price": [number in NGN],
      "locally_sourced": true,
      "local_alternative": null
    }
  ],
  "structural_notes": "Structural engineer narrative: spans, intermediate column positions, beam sizing, slab spec, load paths.",
  "buildability_report": "Professional Builder assessment: construction sequence, hoarding requirements, site logistics, maintainability notes.",
  "h_and_s_notes": "Health & Safety plan summary: site hoarding, PPE requirements, sequence safety.",
  "construction_programme": "Construction schedule summary: foundation → frame → envelope → fit-out → handover with indicative durations.",
  "compliance": {
    "status": "PENDING_VERIFICATION",
    "notes": "Pre-screen only. Requires sign-off by registered Architect, Structural Engineer, and Builder."
  },
  "image_prompt": "Cinematic architectural photography, exterior elevation, ultra-modern minimalist villa, [specific materials from design], golden hour lighting, Lagos Nigeria setting, photorealistic, 8K"
}
<<<DESIGN_DATA_END>>>

## HANDLING AMBIGUOUS OR INCOMPLETE BRIEFS

If the brief is too vague to generate a full SpatialProgram, set "status": "DISCOVERY" and populate "discovery_questions" instead of rooms:

<<<DESIGN_DATA_START>>>
{
  "status": "DISCOVERY",
  "discovery_questions": [
    "What is the total plot size in square metres?",
    "How many bedrooms and floors do you require?",
    "Is this a residential or commercial project?"
  ]
}
<<<DESIGN_DATA_END>>>

## PERSONA

You are precise, authoritative, and technically honest. You flag structural concerns rather than hiding them. You produce numbers your client can take to site. You never claim a design is fully compliant — that is the compliance engine's job, not yours.`;

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZER PROMPT (unchanged from original — only fires for type: 'visualize')
// ─────────────────────────────────────────────────────────────────────────────
const VISUALIZER_PROMPT = `You are an architectural visualization director. Generate a photorealistic image prompt for the described building. Return only a JSON object:
{"imagePrompt": "detailed prompt here", "style": "photorealistic"}`;

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

        const authHeader = req.headers.get('Authorization');
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;

        const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '', {
            global: { headers: { Authorization: authHeader || '' } }
        });

        const { data: authData } = await supabaseClient.auth.getUser(token);
        const user = authData?.user;

        // Admin/PM bypass — verified against server-side claims, not client role
        const isAdmin = user?.app_metadata?.is_admin === true;
        const isPM = user?.app_metadata?.is_pm === true || isAdmin;

        const { prompt, messages: history = [], type = 'text', selectedRole = 'Architect' } = await req.json();

        // ── VISUALIZE PATH (unchanged) ────────────────────────────────────────
        if (type === 'visualize') {
            // Use OpenRouter image generation — no additional API key needed
            // prompt here is the image_prompt string from the Hive JSON
            const enhancedPrompt = `${prompt}, ultra-modern Nigerian residential architecture, 
                Lagos countryside setting, golden hour lighting, lush tropical landscaping, 
                photorealistic architectural photography, 8K, sharp focus, 
                rendered in Lumion, professional real estate photography`;

            try {
                const vizResponse = await fetch('https://openrouter.ai/api/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openRouterKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://genuinestuffs.com',
                    },
                    body: JSON.stringify({
                        model: 'black-forest-labs/flux-2-klein-4b',
                        prompt: enhancedPrompt,
                        n: 1,
                        size: '1024x768',
                    })
                });

                const vizData = await vizResponse.json();
                const imageUrl = vizData.data?.[0]?.url ?? null;
                const imageB64 = vizData.data?.[0]?.b64_json ?? null;

                if (imageUrl || imageB64) {
                    return new Response(JSON.stringify({
                        visualization: imageUrl ?? `data:image/png;base64,${imageB64}`,
                        type: 'visualize',
                        is_image: true,
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            } catch (imgErr) {
                console.warn('[Visualize] Image generation failed, falling back to text:', imgErr);
            }

            // Fallback: text description if image generation fails or model unavailable
            const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://genuinestuffs.com',
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [{ role: 'user', content: `Describe this building as a photorealistic render: ${prompt}` }],
                    max_tokens: 500,
                })
            });
            const fallbackData = await fallbackResponse.json();
            const visualizationText = fallbackData.choices?.[0]?.message?.content ?? '';
            return new Response(JSON.stringify({
                visualization: visualizationText,
                type: 'visualize',
                is_image: false,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ── MAIN DESIGN GENERATION PATH ───────────────────────────────────────

        // ── BUG 1 FIX: prompt is now correctly appended as the current user turn.
        // history contains the prior conversation turns (role: user/assistant).
        // The current prompt is added as the final user message so the model
        // sees the full context PLUS the new request.
        const messagesForModel = [
            { role: "system", content: HIVE_SYSTEM_PROMPT },
            ...history.filter((m: any) => m.role === 'user' || m.role === 'assistant'),
            { role: "user", content: `[${selectedRole} Mode] ${prompt}` }
        ];

        // ── BUG 3 FIX: response_format enforces JSON output so the model cannot
        // return prose-only responses. The delimiter parser remains as a fallback
        // but should rarely be needed now.
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://genuinestuffs.com/"
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: messagesForModel,
                temperature: 0.3,   // Lower than original 0.4 — structural data needs determinism
                max_tokens: 8000    // Villa-scale programs need headroom
            })
        });

        const openRouterData = await response.json();
        let result = openRouterData.choices?.[0]?.message?.content;

        if (!result) {
            throw new Error(`OpenRouter returned no content. Status: ${response.status}`);
        }

        // ── PARSER: Extract design data from tagged block ─────────────────────
        let designData = null;
        const dataBlockRegex = /<<<DESIGN_DATA_START>>>([\s\S]*?)<<<DESIGN_DATA_END>>>/i;
        const match = result.match(dataBlockRegex);

        if (match) {
            const jsonText = match[1].trim();
            try {
                designData = JSON.parse(jsonText);
            } catch (_) {
                // Attempt to strip any markdown fences the model may have added inside the block
                const cleaned = jsonText.replace(/```json|```/g, '').trim();
                try {
                    designData = JSON.parse(cleaned);
                } catch (e2) {
                    console.error("Parser failed to extract JSON from tagged block:", e2);
                }
            }
            // Remove the raw tag block from the narrative text
            result = result.replace(/<<<DESIGN_DATA_START>>>[\s\S]*?<<<DESIGN_DATA_END>>>/i, '').trim();
        } else {
            // Fallback: hunt for any JSON object with AEC keys in the raw text
            const jsonRegex = /\{[\s\S]*?"(?:status|rooms|architectural_layout|project_id)"[\s\S]*\}/i;
            const fallbackMatch = result.match(jsonRegex);
            if (fallbackMatch) {
                try {
                    designData = JSON.parse(fallbackMatch[0]);
                } catch (_) { /* silent — frontend parser will also attempt */ }
            }
        }

        return new Response(JSON.stringify({ result, data: designData, type: 'text' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("AI Studio Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
})
