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
- Master bedrooms: target 12–16m² for premium designs
- Staircase: min clear width 1.2m, max riser 175mm, min tread 250mm, min headroom 2.1m

**Agent 2 — Structural Engineer**
Validates all load-bearing elements:
- Max unbraced beam span: 4.5m for standard residential
- Span-to-depth ratio: 15 (simply supported), 18 (continuous)
- Beam width: 225mm standard
- Slab: 150mm thick, 12mm @ 150mm c/c main, 10mm @ 200mm c/c distribution
- Residential loads: Dead 3.5 kN/m², Live 2.0 kN/m²
- If open-plan area exceeds 4.5m span: introduce intermediate columns or specify deepened RC beams
- Reinforcement: 10mm=0.617kg/m, 12mm=0.888kg/m, 16mm=1.578kg/m, 20mm=2.466kg/m

**Agent 3 — Quantity Surveyor**
Calculates material volumes using Nigerian constants:
- Blockwork: 9-inch = 10 blocks/m², 6-inch = 12.5 blocks/m², +5% waste
- Block laying mortar: 1:6 ratio
- Plaster: 1:4 ratio, 0.2 bags cement/m², 0.02m³ sand/m²
- Concrete C20 (1:2:4): 7.0 bags cement/m³, 0.5m³ sand, 1.0m³ granite
- Concrete C25 (1:1.5:3): 8.5 bags cement/m³, 0.45m³ sand, 0.9m³ granite
- Apply material variation factor: 1.1 and contractor quality factor: 0.85

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
5. For rooms that exceed the 4.5m span limit, set span_m to the actual value — the compliance engine will catch it and report it.
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
      "width_m": [number],
      "span_m": [number — longest clear structural span of this space],
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
      "total_price": [number in NGN]
    }
  ],
  "structural_notes": "Structural engineer narrative: spans, columns, beam sizing, slab spec.",
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
            const vizResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://genuinestuffs.com/"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                        { role: "system", content: VISUALIZER_PROMPT },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7
                })
            });

            const vizData = await vizResponse.json();
            const vizText = vizData.choices?.[0]?.message?.content || '';
            let imagePrompt = prompt;

            try {
                const cleaned = vizText.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                imagePrompt = parsed.imagePrompt || prompt;
            } catch (_) { /* use raw prompt as fallback */ }

            // Call imagen via OpenRouter
            const imgResponse = await fetch("https://openrouter.ai/api/v1/images/generations", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://genuinestuffs.com/"
                },
                body: JSON.stringify({
                    model: "google/imagen-3",
                    prompt: imagePrompt,
                    n: 1,
                    size: "1024x1024"
                })
            });

            const imgData = await imgResponse.json();
            const imageUrl = imgData.data?.[0]?.url || null;

            return new Response(JSON.stringify({ imageUrl, type: 'visualize' }), {
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
                model: "google/gemini-2.0-flash-001",
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
