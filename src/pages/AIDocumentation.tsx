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
        headline: "Turn design ideas into pictures 10 times faster.",
        overview: `The AI Studio changes how architects try out and share design ideas. Early studies of a building's shape and outside walls usually take weeks. Here you can try dozens of design ideas in one sitting. Create shapes from rules you set and try ways of bringing nature into the building. You get life-like pictures straight away, which would normally take a specialist days. The AI understands the words architects use, such as 'post-tensioned canopy', 'courtyard typology' and 'passive solar orientation'. It works with you like a design partner, not just a picture maker.`,
        gains: [
            "Try out a building's overall shape in minutes, not days",
            "Make pictures good enough to show clients, without hiring an illustration team",
            "Try more than 50 designs for the outside walls in one afternoon",
            "Explore greener design ideas and see the result straight away",
            "Go from a rough sketch to a life-like proposal"
        ],
        tips: [
            { title: "Layer your context", body: "Always describe the site: 'tropical climate, south-facing plot, 10m height limit, residential neighbourhood'. The more limits you give, the better the result fits." },
            { title: "Reference architectural styles precisely", body: "Say 'Tadao Ando inspired concrete brutalism with filtered light' rather than just 'modern'. Being specific gives much better results." },
            { title: "Use phase-specific language", body: "Use words that fit the stage of design. Early on: 'massing study, conceptual form'. Later: 'detailed facade with material callouts, parametric cladding pattern'." },
            { title: "Iterate with small tweaks", body: "Start general, then add detail: 'curved glazed facade' → 'fritted glass curved facade with steel mullions at 900mm centres'." }
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
        headline: "See a finished luxury interior before buying a single sample.",
        overview: `Interior designers can use the AI Studio to skip the slowest part of their work: turning what a client asks for into something they can see. Instead of buying sample boards and spending hours on mood boards, create life-like pictures of each room showing exactly which materials go together, the lighting and the layout. The AI knows materials such as terrazzo, limewash, bouclé and zellige, and how they look under different light. Use it to win new clients, get approvals faster and try bold combinations you would otherwise never risk.`,
        gains: [
            "Win new clients with life-like pictures of your ideas",
            "No more sample boards: see materials in the room straight away",
            "Try more than 20 colour schemes before choosing",
            "Lay out FF&E (furniture, fittings and equipment) in minutes",
            "Make a detailed mood board for every room"
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
        headline: "Plan costs ahead instead of reacting to them, with a BoQ (Bill of Quantities) from the start.",
        overview: `A QS (Quantity Surveyor) is often the last protection against a project going over budget. With the AI Studio, you can get ahead of costs instead. The AI pulls together complicated buying information, shows market price trends as pictures, and helps you compare the cost of different choices of materials. Use it to write cost reports for clients quickly, show what a change of material does to the cost, and compare your figures with local market prices as they stand today. It turns raw figures into clear advice about money.`,
        gains: [
            "Compare the cost of different options in far less time",
            "See straight away what swapping a material does to the cost",
            "Make clear cost summaries for clients without a design team",
            "Check your prices against local market prices quickly",
            "Find cheaper ways to get the same result, with pictures to back them up",
            "Turn a project description into a Bill of Quantities, stage by stage, with our Cost Calculator"
        ],
        boqLink: true,
        tips: [
            { title: "State the project stage clearly", body: "'Preliminary estimate at RIBA (Royal Institute of British Architects) Stage 2' gives different output than 'Tender BoQ with full spec'. Always define your stage for accurate outputs." },
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
        headline: "See how loads travel through a building before drawing a single detail.",
        overview: `Structural engineers can use the AI Studio to speed up early design and explaining it to clients. Clear pictures of the structure, such as where the steel bars go, how loads travel down to the ground and how parts join, make technical ideas easy to follow. The AI understands ideas such as shear zones, tension and compression, and how cantilevers behave, so you can show clients and architects pictures to review without waiting for every calculation to be finished.`,
        gains: [
            "Make early pictures of the structure in minutes",
            "Show clients clearly how loads travel and how the structure works",
            "Sketch where the steel bars go, for checks against building codes",
            "Show earthquake and wind forces in pictures for project reports",
            "Speed up early design by comparing types of structure straight away"
        ],
        tips: [
            { title: "Specify structural system first", body: "Lead with the system: 'RC (reinforced concrete) flat slab', 'steel moment frame', 'composite floor deck'. The AI generates far more accurate technical content." },
            { title: "Include span and load parameters", body: "'8m column grid, 5kN/m² imposed load, 6-storey office' gives the AI proper context for reinforcement and member sizing visuals." },
            { title: "Reference design codes when relevant", body: "'Eurocode 2 compliant' or 'BS 8110 (British Standard) reinforcement detailing' contextualises outputs for code-consistent visuals." },
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
        headline: "Stop pipes, ducts and cables clashing before work starts on site.",
        overview: `MEP (Mechanical, Electrical and Plumbing) engineers must fit pipes, ducts and cables through ever-tighter spaces. The AI Studio helps you picture the best routes, spot early where services would clash, and make diagrams that builders can follow on site. Whether you are running HVAC (heating, ventilation and air conditioning) ducts through a crowded ceiling space, taking fire-fighting water pipes around beams and columns, or drawing a complicated electrical riser, the AI makes clear pictures that cut down costly RFIs (requests for information) from site.`,
        gains: [
            "Spot clashing pipes, ducts and cables at the design stage, before they cost money on site",
            "Plan HVAC (heating, ventilation and air conditioning) ducts through crowded ceiling spaces",
            "Make diagrams for areas where several trades work together",
            "Lay out equipment rooms with enough space to maintain everything",
            "Draw clear diagrams of electrical risers and fuse boards"
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
        headline: "Plan how the site will run before the first day of work.",
        overview: `Project managers can use the AI Studio to make clear plans of how the site will run, pictures of the work schedule, and updates for everyone involved, with far less effort than usual. From where the crane stands and where materials are stored, to the order of the building work and pictures for progress reports, the AI helps you explain site decisions clearly. It is especially useful before work starts, when you need to win clients and builders over to your plan for the site.`,
        gains: [
            "Make plans of the site layout and crane positions in minutes",
            "Show the order of the building work in pictures for bids",
            "Make pictures for progress reports to everyone involved",
            "Plan where materials are stored and how vehicles move around the site",
            "Speed up permit applications with clear drawings of the site layout"
        ],
        tips: [
            { title: "State site constraints upfront", body: "'Tight urban site, single access point, live adjacent railway, restricted working hours' — constraints drive the AI to generate practical, constraint-aware logistics." },
            { title: "Use construction phase language", body: "Phase your requests: 'Phase 1 substructure works', 'Phase 2 structural frame', 'Phase 3 MEP (mechanical, electrical and plumbing) first fix'. Each phase has different logistics." },
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
        headline: "Turn site surveys into plans for roads, drains and services straight away.",
        overview: `Civil engineers deal with what most people never see: the drains, roads, pipes, cables and earthworks that make building possible. The AI Studio makes these visible, turning basic survey data into clear pictures. Drainage plans, road cross-sections, how deep services run, and where earth is dug out or filled in can all be shown quickly, so people without a technical background can understand the design. Use it for reports on whether a project can work, environmental applications and building drawings that clients and officials must approve.`,
        gains: [
            "Make drainage plans straight from survey data",
            "Draw road cross-sections that follow the standard rules",
            "Show where earth is dug out or filled in to level the ground",
            "Show clearly how deep pipes and cables run and how they are protected",
            "Illustrate the effect on the environment quickly for planning applications"
        ],
        tips: [
            { title: "State ground conditions and topography", body: "'Clay subsoil, 3% gradient north to south, high groundwater table at 1.5m BGL (below ground level)' gives the AI the context to generate appropriate drainage solutions." },
            { title: "Reference local authority standards", body: "'Adopt to Lagos State highway standard' or 'Federal Ministry of Works standard road cross-section' orients the AI to the right specification context." },
            { title: "Use gradient and invert levels", body: "Specify: 'gravity sewer at 1:150 minimum gradient, invert level 2.5m below FFL (finished floor level)' for drainage design accuracy in outputs." },
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
        headline: "See a garden or landscape come to life before choosing a single plant.",
        overview: `Landscape architects bring together nature, design and how people use a space, and the AI Studio understands all three. Create life-like planting pictures showing local plants fully grown. Show paved and built areas with the right textures and at human scale. Make views for each season to show how a space changes through the year. The AI helps you win planning approval, impress clients with views they can step into, and try out nature-friendly options that used to need a specialist adviser.`,
        gains: [
            "Make life-like pictures of planting and paving once fully grown",
            "Plan local plants down to the exact species",
            "Show the space in each season",
            "Show how rainwater drainage fits into the planting",
            "Make landscape pictures good enough for planning applications"
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
        headline: "Spot dangers before your workers meet them. No surprises on site.",
        overview: `Site supervisors look after the most important part of any project: the people. The AI Studio helps you spot safety risks early and explain them before anyone gets hurt. Make clear safety pictures for your own site, such as plans to stop falls, routes for vehicles, barriers around holes and trenches, and checklists for scaffolding, so you can brief your workers with confidence. Use it for short safety talks on site, diagrams of dangers, and the paperwork needed before risky jobs, keeping everyone on site safe and informed.`,
        gains: [
            "Make site safety plans and no-go zone diagrams straight away",
            "Show how to prevent falls on your particular site",
            "Make pictures for short safety talks that workers really understand",
            "Show barriers around holes and trenches, and temporary supports",
            "Prepare work permits for risky jobs faster, with clear pictures of the risks"
        ],
        tips: [
            { title: "Be specific about the work phase", body: "'Concreting pour from mobile pump at 3rd floor slab edge' produces targeted safety content vs just 'concrete works'. Phase specificity drives relevant hazard identification." },
            { title: "Name the specific hazard clearly", body: "'Fall from height at unprotected slab edge' is better than 'fall hazard'. The AI generates control measures that match the specific risk." },
            { title: "Reference the relevant regulation", body: "'Construction (Design and Management) Regulations 2015' or 'OSHA (US Occupational Safety and Health Administration) 1926 Subpart M Fall Protection' — regulatory context keeps outputs standard-compliant." },
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
/** The profession as shown to readers; the role value itself goes to AI Studio unchanged. */
const ROLE_NAME: Record<string, string> = { QS: "Quantity Surveyor (QS)", "MEP Engineer": "MEP (Mechanical, Electrical and Plumbing) Engineer" };
const roleName = (role: string) => ROLE_NAME[role] ?? role;

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
                            <Cpu className="w-3 h-3 animate-pulse" /> AI Studio Guide v4.0
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                        AI Studio<br />
                        <span className="text-primary">Professional Guide</span>
                    </h1>
                    <p className="text-base text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mb-8">
                        Step-by-step guides, ways to save time, example requests to the AI and expert tips for every kind of building professional.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {[
                            { icon: <Zap className="w-4 h-4" />, label: "Work 10 Times Faster" },
                            { icon: <Lightbulb className="w-4 h-4" />, label: "Writing Good Requests" },
                            { icon: <MessageSquare className="w-4 h-4" />, label: "Everyday Examples" },
                            { icon: <ShieldCheck className="w-4 h-4" />, label: "9 Professions" },
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-2">Choose Your Profession</p>
                        
                        {/* Mobile Dropdown */}
                        <div className="block lg:hidden mb-6 px-2 w-full max-w-full">
                            <Select value={activeRole} onValueChange={(val) => { setActiveRole(val); setExpandedTip(null); }}>
                                <SelectTrigger className="w-full bg-white dark:bg-card border-slate-200 dark:border-border rounded-xl h-12 font-bold text-sm shadow-sm">
                                    <SelectValue placeholder="Choose Your Profession" />
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
                                                {roleName(p.role)}
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
                                    {roleName(p.role)}
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
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1.5">{roleName(active.role)}</h2>
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
                                <TrendingUp className="w-3.5 h-3.5" /> How It Saves You Time
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
                                <MessageSquare className="w-3.5 h-3.5" /> Example Requests to Try
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
                                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 block">Ready to start?</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">Open the Studio and send your first request in under a minute.</p>
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
