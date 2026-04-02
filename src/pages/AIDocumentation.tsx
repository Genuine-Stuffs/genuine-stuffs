import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import {
    Sparkles, Zap, Target, TrendingUp, ShieldCheck, Cpu, Wand2, Layers,
    Calculator, Map, FileText, History, Compass, Trees, HardHat,
    ArrowRight, ChevronDown, ChevronUp, Lightbulb, MessageSquare,
    CheckCircle2, BookOpen, Settings, DraftingCompass, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ─────────────────────────── data ─────────────────────────── */
const professions = [
    {
        role: "Architect",
        icon: <Wand2 className="w-6 h-6" />,
        color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        accent: "text-violet-500",
        tag: "Design Intelligence",
        headline: "Turn design concepts into visual realities 10x faster.",
        overview: `The AI Studio fundamentally changes how architects explore and communicate design intent. Instead of spending weeks on preliminary massing studies and facade explorations, you can iterate through dozens of design directions in a single session. Generate parametric forms, test biophilic integration, and instantly produce photorealistic massing models that would normally take a rendering specialist days to create. The AI understands architectural language — it responds to concepts like 'post-tensioned canopy', 'courtyard typology', and 'passive solar orientation' — making it a true design collaborator rather than just a generator.`,
        gains: [
            "Reduce massing iteration from days to minutes",
            "Generate client-ready concept visuals without a rendering team",
            "Test 50+ facade options in a single afternoon",
            "Explore sustainable design strategies with instant visual feedback",
            "Bridge the gap between sketch and photorealistic proposal"
        ],
        tips: [
            { title: "Layer your context", body: "Always include site context: 'tropical climate, south-facing plot, 10m height limit, residential neighbourhood'. The more constraints you give, the more relevant the output." },
            { title: "Reference architectural styles precisely", body: "Say 'Tadao Ando inspired concrete brutalism with filtered light' rather than just 'modern'. Specificity dramatically improves results." },
            { title: "Use phase-specific language", body: "For early design: 'massing study, conceptual form'. For later: 'detailed facade with material callouts, parametric cladding pattern'." },
            { title: "Iterate with small tweaks", body: "Start broad, then narrow: 'curved glazed facade' → 'fritted glass curved facade with steel mullions at 900mm centres'." }
        ],
        prompts: [
            { scenario: "Conceptual Design Presentation", prompt: "Generate a massing study for a sustainable residential villa, passive solar design, south-facing, tropical climate, butterfly roof geometry, cross-ventilation focus." },
            { scenario: "Client Mood Board", prompt: "Photorealistic exterior render of a minimalist 3-bed family home, white plastered walls, floor-to-ceiling glazing, surrounded by lush tropical planting, golden hour lighting." },
            { scenario: "Feasibility Study", prompt: "Urban mixed-use tower massing, 18 floors, ground floor retail, residential above, podium car park, rectangular site 30m x 50m, contemporary facade rhythm." },
            { scenario: "Heritage Context", prompt: "New residential extension to a Victorian terrace, reclaimed brick, contemporary zinc roof extension, glazed link between old and new, courtyard garden." }
        ]
    },
    {
        role: "Designer",
        icon: <Sparkles className="w-6 h-6" />,
        color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
        accent: "text-pink-500",
        tag: "Interior Intelligence",
        headline: "Visualise luxury interiors before sourcing a single sample.",
        overview: `Interior designers can use the AI Studio to eliminate the most time-consuming part of their workflow: translating a client brief into a tangible visual direction. Instead of purchasing sample boards and spending hours in mood board apps, generate photorealistic room renders that show exact material pairings, lighting moods, and spatial arrangements. The AI understands the language of materials — terrazzo, limewash, boucle, zellige — and knows how they interact under different lighting conditions. Use it to win pitches, speed up client approvals, and explore fearless combinations you'd otherwise never risk.`,
        gains: [
            "Win client pitches with photorealistic concept renders",
            "Eliminate sample boards — see materials in-situ instantly",
            "Test 20+ colour palette combinations before committing",
            "Generate FF&E layout options in minutes",
            "Produce detailed mood boards for every room"
        ],
        tips: [
            { title: "Specify light source and time of day", body: "'Warm afternoon sun filtering through linen curtains' creates a completely different feel to 'cool overcast morning light with steel-framed windows'." },
            { title: "Name the material precisely", body: "'Calacatta marble' vs 'white marble' — and include finish: 'honed', 'bookmatched', 'leathered'. Material precision is everything." },
            { title: "Describe the human feeling first", body: "Start with the emotional target: 'a cozy Nordic winter cabin feel' — then add materials. The AI translates emotion into material." },
            { title: "Call out furniture scale", body: "Include approximate room dimensions or furniture scale: 'large L-shaped sectional sofa, 3.5m wall art, low profile coffee table' to maintain proper visual hierarchy." }
        ],
        prompts: [
            { scenario: "Luxury Residential Pitch", prompt: "Photorealistic living room render, calacatta marble accent wall, bespoke oak joinery, integrated LED ribbon lighting, deep blue velvet sofa, warm afternoon glow, 4.5m ceiling height." },
            { scenario: "Restaurant Interior Concept", prompt: "Upscale restaurant interior, terrazzo floors, copper pendant lights, curved booth seating in forest green velvet, exposed brick feature wall, evening ambience." },
            { scenario: "Minimalist Home Office", prompt: "Minimalist home office, white limewash walls, solid walnut desk, Eames chair, single large arched window, linen curtains, ceramic pot with fiddle leaf fig." },
            { scenario: "Master Bathroom", prompt: "Luxury en-suite bathroom, floor-to-ceiling zellige tile in sage green, freestanding stone bath, rain shower with brushed bronze fittings, skylights above." }
        ]
    },
    {
        role: "QS",
        icon: <Target className="w-6 h-6" />,
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        accent: "text-amber-500",
        tag: "Cost Intelligence",
        headline: "Shift from reactive costing to predictive BoQ strategy.",
        overview: `Quantity Surveyors are often the last line of defence against cost overruns — but with the AI Studio, they can become a proactive force in project profitability. The AI synthesizes complex procurement landscapes, generates visual representations of market trends, and helps model cost scenarios across multiple alternative specifications. Use it to produce client-facing cost reports quickly, visualize the impact of specification changes, and benchmark against regional market rates in real time. It's a powerful bridge between raw data and clear financial communication.`,
        gains: [
            "Generate cost scenario reports in a fraction of the time",
            "Visualize material substitution impacts instantly",
            "Produce client-ready cost dashboards without a design team",
            "Benchmark against regional market rates quickly",
            "Model value engineering alternatives with visual backups",
            "Generate a phased Bill of Quantities from project descriptions using the dedicated BoQ Calculator"
        ],
        boqLink: true,
        tips: [
            { title: "State the project stage clearly", body: "'Preliminary estimate at RIBA Stage 2' gives different output than 'Tender BoQ with full spec'. Always define your stage for accurate outputs." },
            { title: "Name specifications precisely", body: "'500x500 vitrified porcelain tile, grade A, wall and floor, 250m²' is far more useful than 'tiling'. Precision = accuracy." },
            { title: "Ask for comparatives", body: "Request multiple scenarios: 'compare structural steel frame vs concrete frame for a 10-storey office block, cost and programme implications'." },
            { title: "Use regional context", body: "Specify your location and procurement context: 'Lagos, Nigeria, local contractor rates, current material price index'. Regional context massively improves relevance." }
        ],
        prompts: [
            { scenario: "Preliminary Cost Estimate", prompt: "Generate a preliminary cost breakdown for a 6-storey residential apartment block, Lagos, RC frame construction, 24 units, substructure through to finishes, current market rates." },
            { scenario: "Value Engineering Report", prompt: "Value engineering alternatives for specification change from imported Italian marble to locally sourced Nigerian granite in a hotel lobby, 800m², cost savings and quality comparison." },
            { scenario: "Material Price Trend", prompt: "Analyse market trend for reinforcement steel (12mm rebar) in the Nigerian construction market, Q1 2025, impact on a mid-rise office project BoQ." },
            { scenario: "Client Cost Report", prompt: "Produce a clear client-facing cost summary dashboard for a 4-bed luxury residential project, ₦180M budget, showing cost distribution by trade, contingency and professional fees." }
        ]
    },
    {
        role: "Structural Engineer",
        icon: <DraftingCompass className="w-6 h-6" />,
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        accent: "text-blue-500",
        tag: "Structural Intelligence",
        headline: "Visualise complex load behaviour before drawing a single detail.",
        overview: `Structural engineers can use the AI Studio to dramatically accelerate preliminary design and client communication. Generating clear visual representations of structural systems — reinforcement layouts, load path diagrams, connection details — takes the complexity out of technical communication. The AI understands structural concepts like shear zones, tension/compression diagrams, and cantilever behaviour, making it possible to produce review-ready visuals for clients and architects without waiting for the full calculation package to be completed.`,
        gains: [
            "Produce preliminary structural system visuals in minutes",
            "Communicate load paths and structural behaviour clearly to clients",
            "Generate reinforcement layout concepts for code compliance reviews",
            "Visualize seismic and wind load diagrams for stakeholder reports",
            "Speed up preliminary design with instant structural typology comparison"
        ],
        tips: [
            { title: "Specify structural system first", body: "Lead with the system: 'RC flat slab', 'steel moment frame', 'composite floor deck'. The AI generates far more accurate technical content." },
            { title: "Include span and load parameters", body: "'8m column grid, 5kN/m² imposed load, 6-storey office' gives the AI proper context for reinforcement and member sizing visuals." },
            { title: "Reference design codes when relevant", body: "'Eurocode 2 compliant' or 'BS 8110 reinforcement detailing' contextualises outputs for code-consistent visuals." },
            { title: "Ask for cross-section views", body: "Specify view type: 'cross-section through transfer slab', 'elevation of moment frame', 'isometric of reinforcement cage' for more useful visual outputs." }
        ],
        prompts: [
            { scenario: "Structural System Diagram", prompt: "Cross-section diagram of a post-tensioned flat slab, 8m x 8m bays, 230mm thick, showing tendon profile, stressing pockets, and column head punching shear reinforcement." },
            { scenario: "Foundation Detail", prompt: "Structural detail of a wide pad foundation, 2.5m x 2.5m, 600mm deep, high water table condition, waterproof concrete, starter bars for 450mm RC column." },
            { scenario: "Seismic Load Diagram", prompt: "Elevation diagram of a 10-storey concrete shear wall building, seismic zone 3, showing lateral force distribution, base shear, and floor diaphragm connections." },
            { scenario: "Steel Connection Detail", prompt: "Isometric of a bolted moment connection between UC column and UB beam, endplate connection, 8 x M24 bolts, stiffener plates, weld symbols." }
        ]
    },
    {
        role: "MEP Engineer",
        icon: <Settings className="w-6 h-6" />,
        color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
        accent: "text-cyan-500",
        tag: "Systems Intelligence",
        headline: "Solve service clashes before they reach the site.",
        overview: `MEP engineers face the constant challenge of coordinating complex service routes through increasingly constrained spaces. The AI Studio helps visualise optimal routing strategies, identify potential clash zones early, and generate coordination diagrams that contractors can actually understand on site. Whether it's mapping HVAC ductwork through a congested ceiling void, routing fire mains around structural elements, or diagramming a complex electrical riser, the AI can produce coordination-ready visuals that reduce costly site RFIs.`,
        gains: [
            "Identify service clashes at design stage before they cost money on site",
            "Generate HVAC routing concepts for congested ceiling voids",
            "Produce coordination diagrams for multi-trade areas",
            "Visualise plant room layouts with proper maintenance clearances",
            "Create clear electrical riser and distribution board schematics"
        ],
        tips: [
            { title: "Specify the services in priority order", body: "In real coordination, gravity wins. State: 'drainage to fall at minimum 1:80, then HVAC, then electrical tray, then water' so the AI applies correct coordination hierarchy." },
            { title: "Define ceiling/floor void depth", body: "'300mm suspended ceiling void' vs '600mm raised access floor' completely changes routing strategy. Always state available zones." },
            { title: "Flag fire-rated compartments", body: "'Fire compartment boundary at this wall, all penetrations to be sealed' is critical context for routing and routing diagram accuracy." },
            { title: "Use isometric for plant rooms", body: "Request: 'isometric 3D layout of plant room' for complex coordination drawings — much more readable than flat plans." }
        ],
        prompts: [
            { scenario: "HVAC Ceiling Coordination", prompt: "Isometric coordination diagram, congested 350mm suspended ceiling void, 600mm wide rectangular ductwork, 2x 110mm soil pipes, 3-tier electrical cable tray, sprinkler main, showing routing hierarchy and clash-free path." },
            { scenario: "Plant Room Layout", prompt: "Plant room layout plan, chiller unit 2.5m x 1.5m, AHU 3m x 2m, pressurisation unit, BMS control panel, maintenance access clearances of 1m all around, pipe routes to risers." },
            { scenario: "Electrical Riser Diagram", prompt: "Single-line electrical riser diagram, 11-storey commercial office, 1600A main incomer, floor distribution boards at each floor, emergency circuits, separate riser for communications and data." },
            { scenario: "Fire Sprinkler Zoning", prompt: "Reflected ceiling plan showing wet pipe sprinkler system zoning, 10-storey office floor plate, sprinkler head layout at 3m centres, zone control valves, BS EN 12845 compliant." }
        ]
    },
    {
        role: "Project Manager",
        icon: <History className="w-6 h-6" />,
        color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        accent: "text-orange-500",
        tag: "Programme Intelligence",
        headline: "Visualise project logistics before the first day on site.",
        overview: `Project Managers can use the AI Studio to produce clear, compelling site logistics plans, programme visualisations, and stakeholder communication materials at a fraction of the normal effort. From crane positioning and material laydown areas to construction sequence diagrams and progress report visuals, the AI helps you communicate complex site management decisions clearly. It's particularly powerful for pre-start planning, where you need to sell your site strategy to clients and contractors before any physical work begins.`,
        gains: [
            "Produce site logistics plans and crane position diagrams in minutes",
            "Generate construction sequence visuals for tender submissions",
            "Create progress report imagery for stakeholder updates",
            "Visualise material staging areas and traffic management routes",
            "Speed up permit applications with clear site layout drawings"
        ],
        tips: [
            { title: "State site constraints upfront", body: "'Tight urban site, single access point, live adjacent railway, restricted working hours' — constraints drive the AI to generate practical, constraint-aware logistics." },
            { title: "Use construction phase language", body: "Phase your requests: 'Phase 1 substructure works', 'Phase 2 structural frame', 'Phase 3 MEP first fix'. Each phase has different logistics." },
            { title: "Include crane type and capacity", body: "'Liebherr 150 EC-B 8 tower crane, 50m jib radius' produces a far more useful positioning diagram than 'tower crane'. Specificity matters." },
            { title: "Request aerial perspective for site plans", body: "Specify 'aerial site logistics plan' for top-down views or 'perspective site hoarding perspective' for client-facing materials." }
        ],
        prompts: [
            { scenario: "Site Logistics Plan", prompt: "Aerial site logistics plan, inner-city construction site, 40m x 60m footprint, single tower crane central position, site office compound, material laydown area, welfare facilities, hoarding line, single access/egress point." },
            { scenario: "Construction Sequence", prompt: "Construction sequence diagram for 8-storey RC frame building, Phase 1 piling, Phase 2 ground floor slab, Phase 3 frame erection per floor, Phase 4 cladding, showing critical path milestones." },
            { scenario: "Progress Report Visual", prompt: "Site progress photo-realistic render, 6-storey office building at superstructure level, RC frame complete to 4th floor, ground floor hoarding, tower crane in operation, workers in PPE visible." },
            { scenario: "Traffic Management", prompt: "Traffic management plan for urban construction site, articulated lorry routes, banksman positions, pedestrian diversion route, temporary traffic lights at site entrance, signage locations." }
        ]
    },
    {
        role: "Civil Engineer",
        icon: <Compass className="w-6 h-6" />,
        color: "bg-green-500/10 text-green-500 border-green-500/20",
        accent: "text-green-500",
        tag: "Infrastructure Intelligence",
        headline: "Convert site surveys into comprehensive infrastructure concepts instantly.",
        overview: `Civil engineers deal with the invisible — the drainage, roads, utilities, and earthworks that make development possible. The AI Studio makes the invisible visible, helping you generate clear infrastructure visualisations from basic survey data. Drainage strategies, road sections, utility depth plans, and cut-and-fill diagrams can all be produced quickly, making civil engineering design far more communicable to non-technical stakeholders. Use it for feasibility reports, environmental submissions, and construction drawings that need to land clearly with clients and approvers.`,
        gains: [
            "Produce drainage strategy visuals directly from survey data",
            "Generate road section details compliant with standard specifications",
            "Visualise cut-and-fill earthworks for grading plans",
            "Communicate utility depth and protection requirements clearly",
            "Speed up environmental impact illustration for planning submissions"
        ],
        tips: [
            { title: "State ground conditions and topography", body: "'Clay subsoil, 3% gradient north to south, high groundwater table at 1.5m BGL' gives the AI the context to generate appropriate drainage solutions." },
            { title: "Reference local authority standards", body: "'Adopt to Lagos State highway standard' or 'FMWR standard road cross-section' orients the AI to the right specification context." },
            { title: "Use gradient and invert levels", body: "Specify: 'gravity sewer at 1:150 minimum gradient, invert level 2.5m below FFL' for drainage design accuracy in outputs." },
            { title: "Distinguish between adopted and private infrastructure", body: "Clearly state 'public adopted road' vs 'private estate road' — standards differ significantly and the AI will adjust accordingly." }
        ],
        prompts: [
            { scenario: "Site Drainage Strategy", prompt: "Drainage strategy plan for 2ha residential development, clay subsoil, 2% site gradient, sustainable urban drainage (SUDS), permeable paving, bioswale, attenuation pond, outfall to existing culvert." },
            { scenario: "Road Cross-Section", prompt: "Standard road cross-section, 6m wide carriageway, 2m footpaths each side, 100mm flexible pavement construction, sub-base detail, kerb and channel, highway drainage, utility service clearances shown." },
            { scenario: "Earthworks Cut and Fill", prompt: "3D representation of cut and fill earthworks for a hillside development, cut zone north side, fill zone south, balancing calculation shown, retained earth slopes at 1:2, top of bank markers." },
            { scenario: "Utility Depth Plan", prompt: "Utility depth and protection plan for site with multiple existing services, gas main 750mm depth, water main 900mm, electricity duct 600mm, telecoms duct 450mm, safe dig zones, hand-dig requirements." }
        ]
    },
    {
        role: "Landscape Architect",
        icon: <Trees className="w-6 h-6" />,
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        accent: "text-emerald-500",
        tag: "Landscape Intelligence",
        headline: "Bring landscapes to life before a single plant is specified.",
        overview: `Landscape architects work at the intersection of ecology, design, and human experience — and the AI Studio understands this complexity. Generate rich, photorealistic planting concepts that show native species thriving at maturity. Visualise hardscape areas with correct material textures and human scale. Produce seasonal views that show how a space will evolve through the year. The AI helps you win planning approvals, wow clients with immersive views, and explore ecological alternatives that would previously require specialist ecological consultancy.`,
        gains: [
            "Produce photorealistic soft and hardscape visuals at maturity",
            "Generate native planting plans with species-level accuracy",
            "Create seasonal perspective views (spring, summer, autumn, winter)",
            "Visualise sustainable drainage integration within planting design",
            "Produce planning-level landscape and visual impact illustrations"
        ],
        tips: [
            { title: "Specify plants at maturity", body: "Write 'multi-stem birch 6m at maturity, silver bark' rather than 'birch tree'. The AI renders plants at their mature size and character." },
            { title: "State ecological intent", body: "'Pollinator-rich meadow, native grasses and wildflowers, wet edge zone near pond' gives ecological context for species-accurate planting concepts." },
            { title: "Name the hardscape material precisely", body: "'Sawn York stone paving at 600x400' or 'resin-bound gravel in mid-grey, 15mm depth' — generic 'paving' will always produce a generic result." },
            { title: "Include human activity cues", body: "'Children playing in splash pad', 'elderly residents on café seating under pergola' — human activity creates life in landscape renders and makes them far more compelling." }
        ],
        prompts: [
            { scenario: "Residential Garden Masterplan", prompt: "Photorealistic rear garden, mature planting at 5 years, multi-stem birch grove, wildflower meadow strip, oak sleeper raised beds, Indian sandstone paving, outdoor dining terrace, children's lawn, warm summer afternoon." },
            { scenario: "Urban Public Plaza", prompt: "Urban public plaza at ground level, granite sett paving, formal tree lines of pleached hornbeam at 5m centres, water feature, cycle parking, café seating pods, mixed age users, dusk lighting." },
            { scenario: "Ecological Corridor", prompt: "Ecological corridor planting plan, 8m wide linear greenway, native hedgerow species (hawthorn, blackthorn, field maple), wildflower verge, bat and bird boxes on retained trees, permeable path surface." },
            { scenario: "Rooftop Garden", prompt: "Rooftop garden on commercial building, lightweight planting substrate, raised deck areas, sedum green roof section, ornamental grasses and lavender, city skyline backdrop, summer evening workers relaxing." }
        ]
    },
    {
        role: "Site Supervisor",
        icon: <HardHat className="w-6 h-6" />,
        color: "bg-red-500/10 text-red-500 border-red-500/20",
        accent: "text-red-500",
        tag: "Safety Intelligence",
        headline: "See hazards before your crew does. Zero surprises on site.",
        overview: `Site Supervisors are responsible for the most important asset on any project: the people. The AI Studio helps you proactively identify and communicate safety risks before they become incidents. Generate clear, site-specific safety visuals — fall protection plans, traffic management schemes, excavation edge protection, scaffold inspection checklists — that you can brief your crew with confidence. Use it to produce toolbox talk visuals, hazard identification diagrams, and permit-to-work support materials that keep every person on your site safe and informed.`,
        gains: [
            "Produce site safety plans and exclusion zone diagrams instantly",
            "Generate fall protection visualisations for specific site conditions",
            "Create toolbox talk support imagery that crews actually understand",
            "Visualise excavation edge protection and temporary works",
            "Speed up permit-to-work preparation with clear risk visuals"
        ],
        tips: [
            { title: "Be specific about the work phase", body: "'Concreting pour from mobile pump at 3rd floor slab edge' produces targeted safety content vs just 'concrete works'. Phase specificity drives relevant hazard identification." },
            { title: "Name the specific hazard clearly", body: "'Fall from height at unprotected slab edge' is better than 'fall hazard'. The AI generates control measures that match the specific risk." },
            { title: "Reference the relevant regulation", body: "'Construction (Design and Management) Regulations 2015' or 'OSHA 1926 Subpart M Fall Protection' — regulatory context keeps outputs standard-compliant." },
            { title: "Include number of workers and trades", body: "'15 workers on this floor: 6 carpenters, 5 steel fixers, 3 concreters, 1 banksman' — worker numbers and trades drive more realistic safety diagrams." }
        ],
        prompts: [
            { scenario: "Fall Protection Safety Plan", prompt: "Site safety plan for 5th floor RC slab concreting operation, unprotected perimeter edge, scaffold handrail system, safety netting below, exclusion zone on ground floor below, PPE requirements, safety signage locations." },
            { scenario: "Excavation Safety", prompt: "Deep excavation safety diagram, 4m deep, clay subsoil, trench box shoring, edge protection barriers, ladder access point, exclusion zone, banksman position, groundwater pumping arrangement." },
            { scenario: "Toolbox Talk Visual", prompt: "Toolbox talk visual aid: working at height, illustrating 3 key hazards (unprotected edges, unsecured materials, overloaded platforms), correct control measures shown, simple and clear for non-English speaking workers." },
            { scenario: "Scaffold Inspection Diagram", prompt: "Scaffold inspection checklist visual, tube and fitting scaffold, 4 lifts, identifying correct tie pattern, bracing, base plates, guard rails at 950mm and 470mm, toe boards, ladder access, tied to building wall." }
        ]
    }
];

/* ─────────────────────────── component ─────────────────────────── */
const AIDocumentation = () => {
    const [activeRole, setActiveRole] = useState<string>(professions[0].role);
    const [expandedTip, setExpandedTip] = useState<number | null>(null);

    const active = professions.find(p => p.role === activeRole)!;

    return (
        <div className="min-h-screen bg-background dark:bg-background transition-colors">
            <Navbar />

            {/* ── Hero ── */}
            <section className="border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-card/30 py-16">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
                            <Cpu className="w-3 h-3 animate-pulse" /> Studio Documentation v4.0
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                        AI Studio<br />
                        <span className="text-primary">Professional Guide</span>
                    </h1>
                    <p className="text-base text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mb-8">
                        Detailed playbooks, efficiency strategies, prompt templates and expert tips for every professional discipline on the platform.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { icon: <Zap className="w-4 h-4" />, label: "10x Productivity" },
                            { icon: <Lightbulb className="w-4 h-4" />, label: "Prompt Mastery" },
                            { icon: <MessageSquare className="w-4 h-4" />, label: "Common Scenarios" },
                            { icon: <ShieldCheck className="w-4 h-4" />, label: "9 Disciplines" },
                        ].map((badge, i) => (
                            <span key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <span className="text-primary">{badge.icon}</span>{badge.label}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Main Two-Column Layout ── */}
            <div className="container mx-auto px-4 max-w-6xl py-12">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ── Sidebar: Profession Picker ── */}
                    <aside className="lg:w-56 flex-shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">Select Discipline</p>
                        
                        {/* Mobile Dropdown */}
                        <div className="block lg:hidden mb-6 px-2 w-full max-w-full">
                            <Select value={activeRole} onValueChange={(val) => { setActiveRole(val); setExpandedTip(null); }}>
                                <SelectTrigger className="w-full bg-white dark:bg-card border-slate-200 dark:border-border rounded-xl h-12 font-bold text-sm shadow-sm">
                                    <SelectValue placeholder="Select Discipline" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-card border-slate-200 dark:border-border rounded-xl shadow-xl z-[200]">
                                    {professions.map(p => (
                                        <SelectItem
                                            key={p.role}
                                            value={p.role}
                                            className="font-bold text-sm py-3 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={p.accent}>{p.icon}</span>
                                                {p.role}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Desktop Sidebar Nav */}
                        <nav className="hidden lg:flex flex-col gap-1 pb-2 lg:pb-0">
                            {professions.map(p => (
                                <button
                                    key={p.role}
                                    onClick={() => { setActiveRole(p.role); setExpandedTip(null); }}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all w-full text-xs font-semibold
                                        ${activeRole === p.role
                                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-card'}`}
                                >
                                    <span className={activeRole === p.role ? 'text-white' : 'text-primary'}>{p.icon}</span>
                                    {p.role}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* ── Content Area ── */}
                    <main className="flex-1 min-w-0 space-y-8">

                        {/* Header Card */}
                        <div className={`p-5 md:p-6 rounded-2xl border ${active.color} bg-opacity-5`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5">
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                                    <div className={`p-3 rounded-xl border ${active.color} bg-white dark:bg-card shrink-0`}>
                                        {active.icon}
                                    </div>
                                    <Button asChild size="sm" className="md:hidden rounded-xl font-bold text-xs shrink-0 shadow-md">
                                        <Link to={`/pro/ai-studio?role=${active.role}`}>
                                            Open Studio <ArrowRight className="w-3 h-3 ml-1" />
                                        </Link>
                                    </Button>
                                </div>
                                <div className="flex-1 w-full">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${active.accent} mb-1 block`}>{active.tag}</span>
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1.5">{active.role}</h2>
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed max-w-[100%]">{active.headline}</p>
                                </div>
                                <Button asChild size="sm" className="hidden md:flex rounded-xl font-bold text-xs shrink-0 ml-auto shadow-md">
                                    <Link to={`/pro/ai-studio?role=${active.role}`}>
                                        Open Studio <ArrowRight className="w-3 h-3 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Overview */}
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" /> Overview
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{active.overview}</p>
                        </div>

                        {/* Efficiency Gains */}
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5" /> How It 10x Your Efficiency
                            </h3>
                            <ul className="space-y-2">
                                {active.gains.map((gain, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${active.accent}`} />
                                        {gain}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Tips and Tricks */}
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <Lightbulb className="w-3.5 h-3.5" /> Tips & Tricks for Best Results
                            </h3>
                            <div className="space-y-2">
                                {active.tips.map((tip, i) => (
                                    <div key={i} className="border border-slate-200 dark:border-border rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setExpandedTip(expandedTip === i ? null : i)}
                                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-card/50 transition-colors"
                                        >
                                            <span className="text-sm font-semibold text-slate-800 dark:text-white">{tip.title}</span>
                                            {expandedTip === i
                                                ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            }
                                        </button>
                                        {expandedTip === i && (
                                            <div className="px-4 pb-4 pt-1 bg-slate-50 dark:bg-card/30 border-t border-slate-100 dark:border-border">
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip.body}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* BoQ Calculator Callout — only shown for QS */}
                        {(active as any).boqLink && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                        <Calculator className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-0.5">Interactive BoQ Calculator</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400/80">Upload blueprints or describe your project to instantly generate a phased, AI-powered Bill of Quantities with material costs.</p>
                                    </div>
                                </div>
                                <Button asChild size="sm" className="rounded-xl font-bold text-xs shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0">
                                    <Link to="/calculators">
                                        Open BoQ Calculator <ArrowRight className="w-3 h-3 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        )}

                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" /> Common Scenario Prompts
                            </h3>
                            <div className="space-y-4">
                                {active.prompts.map((p, i) => (
                                    <div key={i} className="rounded-xl border border-slate-200 dark:border-border overflow-hidden">
                                        <div className="px-4 py-3 md:py-2.5 bg-slate-50 dark:bg-card border-b border-slate-100 dark:border-border flex items-center justify-between gap-2 overflow-hidden w-full">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{p.scenario}</span>
                                            <Button
                                                asChild
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary px-3 rounded-lg"
                                                onClick={() => {}}
                                            >
                                                <Link to={`/pro/ai-studio?role=${active.role}`}>Try it →</Link>
                                            </Button>
                                        </div>
                                        <div className="p-4 bg-background dark:bg-background">
                                            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed italic">"{p.prompt}"</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="p-5 md:p-6 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 w-full max-w-full overflow-hidden">
                            <div className="w-full">
                                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 block">Ready to get started as a {active.role}?</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">Open the Studio and run your first prompt in under 60 seconds.</p>
                            </div>
                            <Button asChild className="w-full md:w-auto h-11 md:h-9 justify-center rounded-xl font-bold uppercase tracking-wide text-xs px-6 shrink-0 mt-2 md:mt-0 whitespace-nowrap">
                                <Link to={`/pro/ai-studio?role=${active.role}`}>
                                    Launch Studio <Zap className="w-3.5 h-3.5 ml-2" />
                                </Link>
                            </Button>
                        </div>

                    </main>
                </div>
            </div>

        </div>
    );
};

export default AIDocumentation;
