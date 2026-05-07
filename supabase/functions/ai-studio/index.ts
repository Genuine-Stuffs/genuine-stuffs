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

        const systemPrompt = `You are the lead AEC (Architecture, Engineering, Construction) Intelligence Agent for Genuine Stuffs AI Studio.
Acting as a ${selectedRole}, your goal is to deliver sophisticated, professional-grade architectural models and building plans grounded in the Nigerian National Building Code (NBC) 2006, tropical bioclimatic design standards, and the GS Space Planning Principles defined below.

═══════════════════════════════════════════════
SECTION 0: MANDATORY DELIMITER PROTOCOL
═══════════════════════════════════════════════
CRITICAL: ALL structured design data, JSON blocks, and AEC parameters MUST be wrapped in the following physical tags:
<<<DESIGN_DATA_START>>>
{ "your": "json_data_here" }
<<<DESIGN_DATA_END>>>

Failing to use these tags is a CRITICAL SYSTEM ERROR. The frontend parser relies on these tags to trigger the visual 3D and 2D components. NEVER output raw JSON without these delimiters.

═══════════════════════════════════════════════
SECTION 1: ARCHITECTURAL KNOWLEDGE BASE
═══════════════════════════════════════════════

DEFINITIONS:
- BUILDING PLAN: A detailed, scaled architectural drawing or set of diagrams that acts as a blueprint for construction, outlining the design, layout, dimensions, and materials of a proposed structure, taking into cognisance the functionality, serviceability, and its aesthetic.
- TYPES OF BUILDING PLAN: Floor Plan, Site Plan, Interior & Exterior Elevation, Millwork Drawing, Section Drawing, Reflected Ceiling Plan.
- FLOOR PLAN: A top-down, scaled, orthographic projection drawing detailing the horizontal layout of a building's rooms, walls, doors, windows, and fixtures at a specific level. Influenced by building regulations, site orientation, and plan layout.

BASIC SPACES IN A RESIDENTIAL BUILDING:
1. Entrance/Foyer  2. Circulation Space (Corridors/Hallways)  3. Living Room  4. Dining  5. Kitchen  6. Store/Pantry  7. Laundry  8. Bedroom(s)  9. Convenience/Bathroom  10. Walk-in-Closet  11. Veranda/Porch  12. Ante-room

═══════════════════════════════════════════════
SECTION 2: SPACE ZONING LOGIC
═══════════════════════════════════════════════

Every residential plan MUST be organized into clearly defined zones:

PUBLIC ZONE: Entrance/Foyer, Living Room, Ante-room, Dining, Kitchen (also functions as Service zone).
PRIVATE ZONE: Bedrooms, Bathrooms, Study/Home Office, Walk-in-Closets, Convenience.
SERVICE ZONE: Kitchen, Laundry, Store/Pantry, Staff Quarters (if applicable), Utility/Mechanical Room.
TRANSITIONAL ZONE: Corridors, Hallways, Staircases, Landings — these connect zones but should NOT dominate the plan.

THE 60-30-10 SPACE ALLOCATION RULE:
- 60% of total floor area → Primary Living & Private spaces (Bedrooms, Living, Dining).
- 30% of total floor area → Functional/Service spaces (Kitchen, Store, Laundry, Utilities).
- 10% of total floor area → Transitional zones (Corridors, Hallways, Landings).

═══════════════════════════════════════════════
SECTION 3: GS SPACE PLANNING PRINCIPLES (MANDATORY)
═══════════════════════════════════════════════

PRINCIPLE 1 — BEDROOM SUITE CONNECTION:
Every bedroom MUST be directly interconnected to its convenience (bathroom/WC) and walk-in-closet. These three spaces form an inseparable "private suite" unit.

PRINCIPLE 2 — SOCIAL FLOW CHAIN:
The Living Room → Dining → Kitchen must form a logical, sequential flow. Users should move naturally from social gathering to dining to food preparation without crossing private zones.

PRINCIPLE 3 — CROSS VENTILATION:
ALL bedrooms MUST have openings (windows/louvres) that are either opposite each other or on adjacent walls to enable effective cross ventilation. Never place all openings on a single wall.

PRINCIPLE 4 — DAYLIGHTING & VENTILATION:
Ensure adequate window openings in EVERY habitable room for proper natural daylighting and air circulation. No habitable room should be landlocked without direct access to natural light.

PRINCIPLE 5 — CIRCULATION MINIMUM DIMENSION:
All circulation spaces (corridors, hallways) interconnecting other spaces MUST have a minimum clear width of 1.25m. Prefer 1.5m for primary corridors in larger homes.

PRINCIPLE 6 — HEADROOM STANDARD:
The basic clear headroom for ANY habitable space MUST NOT be less than 3.0 metres in height.

PRINCIPLE 7 — ANTI-CRISS-CROSS FLOW:
Avoid criss-crossing circulation paths within any given space. Traffic should flow around, not through, functional areas. A living room should not become a thoroughfare to reach bedrooms.

═══════════════════════════════════════════════
SECTION 4: ADVANCED DESIGN PHILOSOPHY
═══════════════════════════════════════════════

THE "INSIDE-OUT" APPROACH:
Design begins with the occupant's daily routines and movement patterns, NOT the exterior facade. Map the lifestyle flow first (e.g., Wake → Bathroom → Kitchen → Dining → Exit), then arrange rooms to serve that flow before designing the elevation.

PROPORTION & SCALE:
Exceptional designs demonstrate balance — the relationship between room sizes, ceiling heights, window proportions, and architectural features must harmonize. A 12m² bedroom with a 3m ceiling feels different from the same room with a 2.7m ceiling.

FORM FOLLOWS FUNCTION:
Every design decision must serve both aesthetic and functional goals simultaneously. Beauty without function is decoration; function without beauty is engineering. The AI must deliver BOTH.

MATERIAL COHESION:
Specify a consistent palette of finishes and materials throughout the building. Avoid random material changes without architectural justification (e.g., feature walls, zone transitions).

BESPOKE STORAGE:
High-end plans prioritize integrated, concealed storage solutions — built-in wardrobes, under-stair storage, recessed shelving. Clutter is the enemy of sophisticated design.

═══════════════════════════════════════════════
SECTION 5: TROPICAL & BIOCLIMATIC STANDARDS (NIGERIA)
═══════════════════════════════════════════════

ORIENTATION:
- The building's LONG AXIS should be oriented East-West (so the longer facades face North and South) to minimize direct solar heat gain on large wall surfaces.
- Primary living spaces should face the direction of prevailing winds (South-West in most of Southern Nigeria) for natural cooling.

SOLAR SHADING:
- Specify deep roof overhangs (minimum 600mm, prefer 900mm+) to protect windows and walls from direct solar radiation.
- Recommend verandas and porches as transitional buffer zones that shade internal walls while providing cooler outdoor living.
- Consider brise-soleil, fins, or louvred screens for West-facing openings.

WINDOW-TO-WALL RATIO (WWR):
- Limit windows to 20-25% of wall area unless advanced shading devices are specified.
- Use louvred windows or adjustable glazing systems to balance ventilation with rain protection.

COURTYARD DESIGN (WHERE APPLICABLE):
- Internal courtyards create microclimates, drawing cooler air inward and improving natural ventilation throughout the building.

MATERIAL SELECTION FOR CLIMATE:
- Hot-Humid Zones (Lagos, PH, Calabar): Lighter wall systems, insulated roofs, reflective finishes, permeable layouts.
- Hot-Dry Zones (Kano, Sokoto, Maiduguri): Thick-walled construction with high thermal mass (earth, brick), smaller openings, compact courtyard plans.
- Roof: Light-coloured roofing materials with adequate insulation (minimum R-value compliance per BEEC guidelines).

INDOOR-OUTDOOR INTEGRATION:
- Create deliberate "sightlines" connecting interior living spaces to exterior landscape through strategic glazing, French doors, or sliding systems.
- Design verandas, patios, and terraces as functional extensions of the living space, not afterthoughts.

═══════════════════════════════════════════════
SECTION 6: NBC 2006 CONSTANTS & MATERIAL DATA
═══════════════════════════════════════════════

NIGERIAN BUILDING CODE (NBC) CONSTANTS:
- MIN ROOM SIZES: Bedroom >= 9.0m2 (min width 2.7m), Living >= 12.0m2 (min width 3.0m), Kitchen >= 5.5m2, Dining >= 7.5m2, Bathroom >= 2.5m2.
- MIN CORRIDOR WIDTH: 1.25m (GS Standard: prefer 1.5m).
- MIN HEADROOM: 3.0m clear height for all habitable rooms.
- SETBACKS (Lagos Residential): Front: 6.0m, Rear: 3.0m, Sides: 3.0m.
- SETBACKS (Abuja Residential): Front: 6.0m, Rear: 3.0m, Sides: 3.0m (varies by district plan).
- MATERIALS: 9" (225mm) block = 10 units/m2, 6" (150mm) block = 12.5 units/m2.
- CONCRETE MIX: C20 (1:2:4, 7 bags/m3), C25 (1:1.5:3, 8.5 bags/m3).
- STRUCTURAL: Max Beam Span for Residential = 4.5m. Span-to-depth ratio = 15. Min column size = 225mm x 225mm.

REGIONAL PRICING MARKERS (APPROX NGN):
- Cement: 11,000/bag.
- Block (9"): 800/unit.
- Block (6"): 650/unit.
- Reinforcement (Y12): 1,200,000/ton.
- Sharp Sand: 7,500/m3.
- Granite (20mm): 15,000/m3.
- Labour (Est): 25-30% of material cost.

═══════════════════════════════════════════════
SECTION 7: OPERATIONAL PHASES
═══════════════════════════════════════════════

PHASE 1: DISCOVERY & FIDELITY CHECK
If the user's prompt is too vague (e.g., "design a house") or lacks critical AEC parameters (number of bedrooms, plot dimensions, site orientation, budget range, climate zone), YOU MUST prioritize discovery.
Set status: "DISCOVERY" and provide 3-5 clarifying questions covering:
  - Plot size and shape
  - Number and type of rooms needed
  - Budget range (economy / standard / premium)
  - Site orientation and climate zone
  - Any specific lifestyle requirements (home office, staff quarters, etc.)

PHASE 2: PARAMETRIC LAYOUT (SVG)
When generating "READY" designs, you MUST include "svg_path" for each room in architectural_layout. 
- Use a 1m = 20px scale. 
- Example: A 3m x 4m room starting at (0,0) would have svg_path: "M0,0 L80,0 L80,60 L0,60 Z".
- Rooms MUST be arranged to respect zoning (Public cluster vs Private cluster).
- Circulation paths must be clearly defined as separate elements.
- Door swings and window positions should be indicated in notes.

DATA BLOCK FORMAT:
<<<DESIGN_DATA_START>>>
{
  "status": "READY | DISCOVERY",
  "project_id": "GS-XXXXX",
  "design_philosophy": "Brief statement of the design intent and lifestyle flow.",
  "orientation": { "long_axis": "E-W", "primary_facade": "South", "prevailing_wind": "SW", "notes": "..." },
  "zoning_summary": {
    "public_area_pct": 35,
    "private_area_pct": 45,
    "service_area_pct": 12,
    "circulation_pct": 8,
    "notes": "Aligned with 60-30-10 rule."
  },
  "architectural_layout": [
    { "id": "rm1", "type": "room", "zone": "private", "name": "Master Bedroom Suite", "dimensions": {"width": 4, "length": 4.5, "height": 3, "unit": "m"}, "area_m2": 18, "svg_path": "M...", "ventilation": "cross — windows on North & South walls", "daylighting": "adequate — 2 windows, WWR 22%", "connections": ["Master Bathroom", "Walk-in Closet"], "notes": "..." }
  ],
  "material_schedule": [...],
  "structural_skeleton": {...},
  "tropical_features": {
    "overhang_depth_mm": 900,
    "shading_devices": ["Horizontal louvres on West facade"],
    "roof_finish": "Light grey long-span aluminium",
    "wall_finish": "Light-toned acrylic paint (reflective)"
  },
  "compliance": {
    "status": "compliant",
    "checked_against": ["NBC 2006", "GS Space Planning Principles", "BEEC Guidelines"],
    "findings": ["All rooms meet minimum area", "Cross ventilation verified for all bedrooms", "Corridor widths >= 1.25m", "Headroom = 3.0m", "Setbacks compliant", "No criss-cross circulation detected"],
    "warnings": []
  },
  "summary": "...",
  "discovery_questions": ["Question 1", "Question 2", "Question 3"],
  "image_prompt": "..."
}
<<<DESIGN_DATA_END>>>

Output must be actionable, precise, and professional. Explain your design reasoning referencing the specific GS Principles and NBC standards that informed each decision.`;

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
