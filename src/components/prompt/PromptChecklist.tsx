/**
 * The prompt checklist (owner 2026-10-29): what to put in a design brief so AI Studio plans the
 * building meant, for reviewers and users writing their own prompts, opened from the AI Studio
 * sidebar. Every item is something the app reads from the prompt today (plot.ts, setbacks.ts,
 * minimums.ts, facades.ts, quiet.ts, parking.ts, outbuildings.ts). Phrases in `backticks` show as
 * the words to write. Ticks stay in this browser only.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface Item { id: string; title: string; why?: string }
interface Group { id: string; heading: string; intro?: string; items: Item[] }
interface BuildingType { id: string; label: string; items: Item[]; example?: string; note?: string }

const GENERAL: Group[] = [
    {
        id: "site", heading: "The site and the law",
        intro: "AI Studio reads these straight from your words. Get them right and the plot, the setbacks and the gate come out right.",
        items: [
            { id: "s-type", title: "Name the building and its storeys.", why: "Say `3-bedroom bungalow`, `5-bedroom detached duplex` or `3-storey block of flats`. The number of floors decides almost everything else." },
            { id: "s-plot", title: "Give the plot as frontage × depth, with metres.", why: "Write `on a 15 m × 30 m plot`. The first figure is the side on the road. Without the unit (`15 x 30`) the figure is ignored and the plot becomes a square of the stated area." },
            { id: "s-place", title: "Say where it is.", why: "A Lagos site follows the Lagos State Physical Planning Permit Regulations 2019 (the default). Naming another state or city, such as Abuja, Enugu or Port Harcourt, switches to the National Building Code 2006." },
            { id: "s-law", title: "Name the law if you want a particular one.", why: "`to the National Building Code 2006` or `to the Lagos Physical Planning Permit Regulations 2019`. You choose the law. If your brief breaks it, the plan says so and offers options; it never bends the rule quietly." },
            { id: "s-zone", title: "Mention density, a corner plot or a core area when they apply.", why: "`high density` or `low density` (medium is assumed), `corner plot` (the front setback applies on both road sides), `Lagos Island` or `outside the traditional core` for commercial buildings." },
            { id: "s-setback", title: "State setbacks side by side, each with metres.", why: "`6 m front setback` or `setbacks 9 m front and 4.5 m sides and rear`. If you leave them out, the law's minimums are used. If you ask for less than the law allows, you get a warning." },
            { id: "s-cover", title: "Give site coverage and landscaping for commercial and public buildings.", why: "For example `building within 70% of the plot with 10% landscaping`." },
        ],
    },
    {
        id: "rooms", heading: "The rooms",
        items: [
            { id: "r-list", title: "List the rooms floor by floor.", why: "`Ground floor: sitting room, dining, kitchen… First floor: four en-suite bedrooms…` A room not named is not drawn." },
            { id: "r-suite", title: "Say which bedrooms are en-suite and which share a bathroom.", why: "`master bedroom en-suite, two bedrooms sharing a common bathroom`. Add a walk-in closet or private balcony to the room it belongs to." },
            { id: "r-min", title: "Give a minimum size for rooms that must be big.", why: "Write the size right after the room: `Living room (min 40 sqm)` or `Master bedroom at least 20 m²`. The room can come out bigger, never smaller." },
            { id: "r-side", title: "Put a room on a particular side in brackets.", why: "`Master suite (southern facade)` or `Garage (eastern flank)`. The drawing always has the street at the bottom: south means the street side, east the right-hand side looking from the road." },
            { id: "r-quiet", title: "Ask for quiet bedrooms in so many words.", why: "`keep all bedrooms on the quiet side away from the road` or `bedrooms at the rear`." },
            { id: "r-next", title: "Say which rooms must be next to each other.", why: "`kitchen adjacent to the dining`, `a visitors' toilet off the living area`, `kitchen with a rear store`." },
            { id: "r-stair", title: "For more than one floor, say where the stair goes.", why: "`an internal staircase`, `a central staircase`, or for public buildings the number and width of escape stairs." },
        ],
    },
    {
        id: "compound", heading: "The compound",
        items: [
            { id: "c-out", title: "Name outbuildings plainly.", why: "`boys' quarters` (or `BQ`), `gen house`, `security post at the gate` or `gatehouse`. Boys' quarters and gen houses go at the rear unless you say otherwise; a security post goes by the gate." },
            { id: "c-park", title: "Ask for parking with a number.", why: "`parking for eight cars in the compound` or `14 parking bays`. Parking gives the site a vehicle gate; without it, a house without a car porch gets a pedestrian gate. A garage or carport is a room, so list it with the rooms." },
            { id: "c-car", title: "Size the car porch by cars.", why: "`a car porch for two cars`." },
            { id: "c-serv", title: "Mention services that need space.", why: "Refuse and meter area, overhead tank, water tank, gen set. Say where they go if it matters: `at the side`, `ground-floor refuse and meter area`." },
        ],
    },
];

const TYPES: BuildingType[] = [
    {
        id: "bungalow", label: "Bungalow",
        items: [
            { id: "b-1", title: "Say single-storey.", why: "The word `bungalow` is enough." },
            { id: "b-2", title: "Ask for a front veranda or porch if you want a covered entrance." },
            { id: "b-3", title: "Name the roof.", why: "For example `a parapet roof`." },
            { id: "b-4", title: "On a small plot, keep the room list short.", why: "A 12 m × 18 m plot under the Lagos rules (6 m front, 3 m sides and rear) leaves 6 m × 9 m to build on. If the rooms don't fit, the plan says which ones it had to shrink." },
        ],
        example: "Design a 3-bedroom bungalow on a 12 m × 18 m plot. Rooms: master bedroom en-suite, two bedrooms sharing a common bathroom, open-plan living and dining, kitchen with a rear store, a visitors' toilet off the living area, and a front veranda. Keep all bedrooms on the quiet side away from the road, place the kitchen adjacent to the dining, and allow space for a water tank and gen set at the side.",
    },
    {
        id: "duplex", label: "Duplex",
        items: [
            { id: "d-1", title: "Split the rooms between ground and first floor.", why: "Living rooms, kitchen and a guest room downstairs; family bedrooms and a family lounge upstairs." },
            { id: "d-3", title: "Ask for a visitors' toilet downstairs." },
            { id: "d-4", title: "Name the master suite's extras.", why: "`master with walk-in closet and private balcony`." },
            { id: "d-5", title: "Link the kitchen to the boys' quarters if you want it.", why: "`kitchen with external access to a BQ`." },
            { id: "d-6", title: "Ask for cross-ventilation in the bedrooms.", why: "Write `cross-ventilation on all bedrooms`, and check the windows in the result." },
        ],
        example: "Design a 5-bedroom detached duplex on a 15 m × 30 m plot. Ground floor: sitting room, dining, visitors' toilet, one en-suite guest bedroom, kitchen with external access to a BQ (self-contained boys' quarter), and a car porch for two cars. First floor: four en-suite bedrooms including a master with walk-in closet and private balcony, plus a family lounge. Include an internal staircase, 6 m front setback, cross-ventilation on all bedrooms, and a gen house at the rear.",
    },
    {
        id: "flats", label: "Block of flats",
        items: [
            { id: "f-1", title: "Give the number of flats, flats per floor and floors.", why: "`six 2-bedroom units (two per floor), 3 storeys`. Two flats per floor works best today: each flat then gets its own inner passage to the bedrooms." },
            { id: "f-2", title: "Describe one flat once.", why: "`Each unit: two bedrooms (master en-suite), a shared bathroom, living/dining, kitchen and a balcony.` Every flat gets those rooms." },
            { id: "f-3", title: "Ask for a shared stair.", why: "`a central staircase` serving every floor." },
            { id: "f-4", title: "Ask for floors that stack.", why: "`keep the stacking consistent so plumbing and load-bearing walls align across floors`." },
            { id: "f-5", title: "Give parking as a count, plus security and services.", why: "Parking, a security post at the gate, refuse and meter area, overhead tank." },
        ],
        example: "Design a 3-storey block of flats containing six 2-bedroom units (two per floor) on a 20 m × 30 m plot. Each unit: two bedrooms (master en-suite), a shared bathroom, living/dining, kitchen, and a balcony. Include a central staircase, a ground-floor refuse and meter area, parking for eight cars in the compound, a security post at the gate, and an overhead tank.",
    },
    {
        id: "hotel", label: "Hotel",
        items: [
            { id: "h-1", title: "Give the star rating, room count and storeys.", why: "`a 4-storey, 3-star boutique hotel of 34 rooms`." },
            { id: "h-2", title: "Size the guest rooms and suites.", why: "`10 standard rooms of 24 m² and one suite of 40 m² per floor, all en-suite`. Say which rooms must be accessible." },
            { id: "h-3", title: "List the ground-floor public rooms.", why: "Reception and lobby, lounge or bar, restaurant (give the seats), its kitchen, public WCs, admin office, staff rooms, generator room." },
            { id: "h-4", title: "Give the corridor and the fire escape rules.", why: "Corridor width, the longest dead end, the furthest any room may be from a stair, and the number and width of escape stairs." },
            { id: "h-5", title: "Ask for lifts and housekeeping.", why: "A guest lift, and a service lift beside a housekeeping room on each floor." },
            { id: "h-6", title: "Give parking with how you counted it.", why: "`14 parking bays (1 per 3 rooms plus 1 per 40 m² of restaurant, 1 accessible)`." },
        ],
        note: "Setbacks: hotels follow the commercial rule, which is 9 m front and 4.5 m sides and rear in Lagos, or 3 m all round in a traditional core area. Say `outside the traditional core` or name the area.",
    },
    {
        id: "church", label: "Church",
        items: [
            { id: "w-1", title: "Give the seats and the size of the hall.", why: "`seating 1,000 people`, `main hall about 34 m wide and 21 m deep`." },
            { id: "w-2", title: "Give the seating rules.", why: "Row spacing (`0.95 m row pitch`), most seats between aisles, centre and side aisle widths, wheelchair spaces." },
            { id: "w-3", title: "Describe the front of the hall.", why: "Altar or stage depth, choir and instrument area, instrument store, a vestry off the stage." },
            { id: "w-4", title: "Give the occupant load, the exits and the main entrance width.", why: "`four exits in all for an occupant load of about 1,170`, `main entrance at least 3 m wide`." },
            { id: "w-5", title: "Count the toilets.", why: "WCs for women, WCs and urinals for men, basins, an accessible WC." },
            { id: "w-6", title: "Name the side rooms.", why: "Children's church, nursing mothers' room, ushers' and counting room, bookshop, sound and media booth." },
            { id: "w-7", title: "Give the roof and height.", why: "`a clear-span steel portal roof, the hall no higher than 7.5 m`." },
        ],
        note: "Plot size matters: in Lagos a place of worship needs a plot of 600 m² or more. On 1,500 m² or more the setbacks are 9 m front and 4.5 m sides and rear; between 600 and 1,499 m² they are 6 m and 3 m.",
    },
    {
        id: "other", label: "Others", items: [],
        note: "Schools, hospitals, offices and shops are not tuned yet. You can still try them: use the general items above, list every room with its size, and say which rooms must be next to each other. Expect a rougher plan, and tell us what went wrong in your review.",
    },
];

const MISTAKES: [string, string, string][] = [
    ["15 x 30", "15 m × 30 m plot", "Without a unit the plot size is not read."],
    ["a big parlour", "sitting room (min 30 sqm)", "Only a number sets a minimum."],
    ["some parking", "parking for 6 cars", "A count sets the gate and the parking area."],
    ["small setbacks", "3 m side setbacks", "Each side needs its figure in metres."],
    ["master faces the road", "master bedroom (southern facade)", "Sides are read from brackets after the room's name."],
    ["600 m² plot, 20 × 40 m", "the same area both ways", "If the two disagree by more than 10%, the dimensions are ignored."],
];

const REVIEW: Group = {
    id: "review", heading: "For reviewers: checking the result",
    items: [
        { id: "v-1", title: "Every room you asked for is on the plan, on the right floor.", why: "The notes under the plan name any room the plan had to shrink or leave out." },
        { id: "v-2", title: "The building sits inside the setback lines." },
        { id: "v-3", title: "Every room can be reached through a door, and no bedroom is reached through another bedroom, a kitchen or a balcony." },
        { id: "v-4", title: "Habitable rooms have windows on an outside wall.", why: "Stores and wardrobes don't need them." },
        { id: "v-5", title: "Upper-floor walls stand over walls or beams below.", why: "Spans over 4.5 m are flagged with a warning; 6 m is the most a bay should span." },
        { id: "v-6", title: "The warnings make sense.", why: "A warning should name a real rule. Note any warning that is wrong or missing." },
        { id: "v-7", title: "Save a review with the most important fix.", why: "Use Review this design under the drawings. It saves your prompt and the exact plan, so the fix can be traced." },
    ],
};

const KEY = "gs-prompt-checklist";
// the count is of the items for the kind of building chosen, not every tab
const idsFor = (type: string) => [...GENERAL.flatMap(g => g.items), ...(TYPES.find(t => t.id === type)?.items ?? []), ...REVIEW.items].map(i => i.id);

/** `phrase` → the words to write, shown as a chip */
function Phrased({ text }: { text: string }) {
    return <>{text.split(/(`[^`]+`)/).map((part, i) => part.startsWith("`")
        ? <span key={i} className="font-mono text-[12px] bg-primary/10 text-foreground rounded px-1.5 py-0.5 break-words">{part.slice(1, -1)}</span>
        : <span key={i}>{part}</span>)}</>;
}

function CheckList({ items, ticks, toggle }: { items: Item[]; ticks: Record<string, boolean>; toggle: (id: string, on: boolean) => void }) {
    return (
        <ul className="divide-y divide-border">
            {items.map(item => (
                <li key={item.id}>
                    <label htmlFor={`pc-${item.id}`} className="flex gap-3 py-3 cursor-pointer">
                        <Checkbox id={`pc-${item.id}`} checked={!!ticks[item.id]} onCheckedChange={v => toggle(item.id, v === true)} className="mt-0.5 shrink-0" />
                        <span className="min-w-0 space-y-1">
                            <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                            {item.why && <span className="block text-[13px] leading-relaxed text-muted-foreground"><Phrased text={item.why} /></span>}
                        </span>
                    </label>
                </li>
            ))}
        </ul>
    );
}

export default function PromptChecklist({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [ticks, setTicks] = useState<Record<string, boolean>>(() => {
        try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
    });
    useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(ticks)); } catch { /* private window */ } }, [ticks]);
    const [type, setType] = useState("bungalow");
    const toggle = (id: string, on: boolean) => setTicks(t => ({ ...t, [id]: on }));
    const ids = idsFor(type), done = ids.filter(id => ticks[id]).length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="text-left space-y-2 pr-6">
                    <SheetTitle>Prompt Checklist</SheetTitle>
                    <SheetDescription>What to put in your brief so AI Studio plans the building you mean. Tick each item as your prompt covers it; the ticks stay in this browser.</SheetDescription>
                </SheetHeader>

                <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                    <span className="tabular-nums">{done} of {ids.length} ticked</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${(100 * done) / ids.length}%` }} />
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTicks({})}>Clear ticks</Button>
                </div>

                <div className="mt-6 space-y-8">
                    {GENERAL.map(g => (
                        <section key={g.id} className="space-y-2">
                            <h3 className="text-base font-bold text-foreground">{g.heading}</h3>
                            {g.intro && <p className="text-[13px] text-muted-foreground">{g.intro}</p>}
                            <CheckList items={g.items} ticks={ticks} toggle={toggle} />
                        </section>
                    ))}

                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-foreground">Extra items for each kind of building</h3>
                        <Tabs value={type} onValueChange={setType}>
                            <TabsList className="flex flex-wrap h-auto justify-start gap-1">
                                {TYPES.map(t => <TabsTrigger key={t.id} value={t.id} className="text-xs">{t.label}</TabsTrigger>)}
                            </TabsList>
                            {TYPES.map(t => (
                                <TabsContent key={t.id} value={t.id} className="space-y-3">
                                    {t.items.length > 0 && <CheckList items={t.items} ticks={ticks} toggle={toggle} />}
                                    {t.note && <p className="text-[13px] leading-relaxed border-l-2 border-amber-500 bg-amber-500/10 px-3 py-2 rounded-r"><Phrased text={t.note} /></p>}
                                    {t.example && (
                                        <div className="border-l-2 border-primary bg-muted/50 px-3 py-2 rounded-r space-y-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Example</p>
                                            <p className="text-[13px] leading-relaxed">{t.example}</p>
                                        </div>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-base font-bold text-foreground">Common mistakes</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px]">
                                <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3 font-semibold">Instead of</th><th className="py-2 pr-3 font-semibold">Write</th><th className="py-2 font-semibold">Why</th></tr></thead>
                                <tbody className="divide-y divide-border">
                                    {MISTAKES.map(([bad, good, why]) => (
                                        <tr key={bad} className="align-top"><td className="py-2 pr-3 font-mono text-xs">{bad}</td><td className="py-2 pr-3 font-mono text-xs">{good}</td><td className="py-2">{why}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[13px] text-muted-foreground">If you change your mind, say so in a follow-up message. The latest figure you give wins.</p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="text-base font-bold text-foreground">{REVIEW.heading}</h3>
                        <CheckList items={REVIEW.items} ticks={ticks} toggle={toggle} />
                    </section>

                    <p className="text-xs text-muted-foreground pb-6">The rules here come from the Lagos State Physical Planning Permit Regulations 2019 and the National Building Code 2006, as AI Studio applies them today.</p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
