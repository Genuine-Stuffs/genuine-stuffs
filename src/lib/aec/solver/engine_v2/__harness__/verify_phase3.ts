/**
 * Phase 3 Reopen Verification Script
 * Runs all 5 fixtures across seeds 1-5, reporting per-floor status,
 * relaxationsApplied[], and elapsed_ms for each run.
 */

import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildGraph, HiveRoom } from "../graph";
import { selectFootprint, createRng } from "../shapes";
import { solvePlacement } from "../solver";
import { SolverConfig, ReservedRect } from "../solver/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "..", "__fixtures__");
const SETBACKS = { front: 6, rear: 3, left: 3, right: 3 };
const SEEDS = [1, 2, 3, 4, 5];
const CORRIDOR_D = 1.5;

function loadFixtures(): Array<{ name: string; raw: any }> {
    const files = readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".json"));
    return files.map(name => ({ name, raw: JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf-8")) }));
}

function runFixtureDiag(name: string, raw: any, seed: number) {
    const briefRef = raw.brief_reference ?? {};
    const plotSqm = briefRef.plot_size_sqm ?? 675;
    const plotWidth = Math.sqrt(plotSqm);
    const plotDepth = plotSqm / plotWidth;
    const numFloors = briefRef.floors ?? briefRef.storeys ?? 1;
    const buildableW = Math.max(plotWidth  - SETBACKS.left - SETBACKS.right, 8);
    const buildableH = Math.max(plotDepth - SETBACKS.front - SETBACKS.rear,  8);
    const hiveRooms = (raw.rooms ?? []) as HiveRoom[];
    const graph = buildGraph(hiveRooms);
    const floors = numFloors === 2 ? [0, 1] : [0];
    const rng = createRng(seed);
    const footprint = selectFootprint(buildableW, buildableH, graph, rng);
    const floorDiags: any[] = [];
    let stairCoords: { x: number; y: number; width: number; height: number } | null = null;

    for (const floorIndex of floors) {
        const corridorBounds: Array<{ x: number; y: number; width: number; height: number }> = [];
        let corridorY: number;
        if (floorIndex === 0) {
            const socialH = Math.max(footprint.primary.height * 0.40, 5.1);
            corridorY = footprint.primary.y + socialH;
        } else {
            corridorY = footprint.primary.y;
        }
        corridorBounds.push({ x: footprint.primary.x, y: corridorY, width: footprint.primary.width, height: CORRIDOR_D });

        if (floorIndex === 0 && numFloors === 2) {
            const stairW = 2.4, stairD = 3.6;
            const stairX = footprint.primary.x + footprint.primary.width - stairW;
            const upperCorridorClearance = footprint.primary.y + CORRIDOR_D;
            const stairY = Math.max(corridorBounds[0].y - stairD, upperCorridorClearance);
            stairCoords = { x: stairX, y: stairY, width: stairW, height: stairD };
        }

        const reservedRects: ReservedRect[] = corridorBounds.map((b, i) => ({
            id: `corridor_floor${floorIndex}_${i}`, type: 'circulation' as const,
            x_m: b.x, y_m: b.y, w_m: b.width, h_m: b.height,
        }));
        if (floorIndex === 0 && stairCoords) reservedRects.push({ id: 'stairwell', type: 'stairwell' as const, x_m: stairCoords.x, y_m: stairCoords.y, w_m: stairCoords.width, h_m: stairCoords.height });
        if (floorIndex === 1 && stairCoords) reservedRects.push({ id: 'stairwell_void', type: 'stairwell' as const, x_m: stairCoords.x, y_m: stairCoords.y, w_m: stairCoords.width, h_m: stairCoords.height });

        const config: SolverConfig = { budget_ms: 6000, areaTolerance: 0.10, seed: seed + floorIndex };
        const result = solvePlacement(graph, footprint, floorIndex, hiveRooms, config, reservedRects);
        floorDiags.push({ floor: floorIndex, status: result.status, relaxationsApplied: result.relaxationsApplied, elapsed_ms: result.diagnostics.elapsed_ms, nodesExplored: result.diagnostics.nodesExplored });
    }
    return { fixture: name, seed, floors: floorDiags };
}

function main(): void {
    const fixtures = loadFixtures();
    console.log("\n=== PHASE 3 VERIFICATION · Rung Status + Seed Stability (seeds 1-5) ===\n");
    const allDiags: any[] = [];

    for (const { name, raw } of fixtures) {
        console.log(`\n──── ${name} ────`);
        for (const seed of SEEDS) {
            try {
                const diag = runFixtureDiag(name, raw, seed);
                allDiags.push(diag);
                for (const f of diag.floors) {
                    const relaxStr = f.relaxationsApplied.length ? ` [relaxed: ${f.relaxationsApplied.join(', ')}]` : ' [BASE only]';
                    console.log(`  seed=${seed} floor=${f.floor}: ${f.status}${relaxStr} · ${Math.round(f.elapsed_ms)}ms · ${f.nodesExplored} nodes`);
                }
            } catch (err: any) { console.error(`  seed=${seed} CRASHED: ${err?.message}`); }
        }
    }

    console.log("\n\n=== SEED STABILITY SUMMARY ===\n");
    for (const { name } of fixtures) {
        const rows = allDiags.filter(d => d.fixture === name);
        const allGood = rows.every(d => d.floors.every((f: any) => ['SOLVED','SOLVED_RELAXED','UNSAT'].includes(f.status)));
        const statuses = rows.flatMap((d: any) => d.floors.map((f: any) => `s${d.seed}f${f.floor}:${f.relaxationsApplied.length ? 'RELAXED' : f.status}`));
        console.log(`${allGood ? '✓' : '✗'} ${name}`);
        console.log(`  ${statuses.join('  ')}`);
    }
}

main();
