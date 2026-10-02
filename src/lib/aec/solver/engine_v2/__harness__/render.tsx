/**
 * Render a fixture's solved ground floor exactly as AI Studio draws it
 * (AECFloorPlan, server-rendered) to an SVG file, to LOOK at solver
 * changes instead of only counting invariants.
 *
 *   npx tsx src/lib/aec/solver/engine_v2/__harness__/render.tsx <fixture.json | path> <out.svg> [seed]
 *
 * To view it as an image, convert outside the repo (no project dependency):
 *   cd /tmp/render && npm init -y && npm i @resvg/resvg-js
 *   node -e "const{Resvg}=require('@resvg/resvg-js');const f=require('fs');
 *     f.writeFileSync('out.png',new Resvg(f.readFileSync('out.svg','utf8'),
 *     {fitTo:{mode:'width',value:1100},background:'white'}).render().asPng())"
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { solveLayoutV2 } from "../index";
import AECFloorPlan from "@/components/aec/AECFloorPlan";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "__fixtures__");
const SETBACKS = { front: 6, rear: 3, left: 3, right: 3 }; // same as run.ts / AIStudio.tsx

const [arg, out, seedArg] = process.argv.slice(2);
if (!arg || !out) {
    console.error("usage: render.tsx <fixture.json | path> <out.svg> [seed]");
    process.exit(1);
}
const raw = JSON.parse(readFileSync(arg.includes("/") ? arg : join(FIXTURES_DIR, arg), "utf-8"));
const sqm = raw.brief_reference?.plot_size_sqm ?? 675;
const w = Math.sqrt(sqm);

const log = console.log, warn = console.warn;
console.log = () => {}; console.warn = () => {};
const layout = solveLayoutV2(raw, { width: w, depth: sqm / w, setbacks: SETBACKS },
    { floors_override: raw.brief_reference?.floors ?? 1, seed: Number(seedArg ?? 1) });
const html = renderToStaticMarkup(React.createElement(AECFloorPlan, { layout }));
console.log = log; console.warn = warn;

// The component wraps the plan in UI chrome; the plan is the largest <svg>.
const svgs: string[] = html.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
const svg = svgs.reduce((a, b) => (b.length > a.length ? b : a), "");
writeFileSync(out, svg.includes("xmlns=") ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'));
log(`${layout.solver_status}${layout.solver_fallback ? " (fallback)" : ""}: ` +
    `${layout.placed_rooms.length} rooms, building ${layout.building_width} x ${layout.building_depth} m -> ${out}`);
