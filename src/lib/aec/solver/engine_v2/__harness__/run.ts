/**
 * Genuine Stuffs AI Studio · Solver V2 · Fixture Harness Runner
 * ═══════════════════════════════════════════════════════════════════════
 * PHASE 2 · July 2026
 *
 * Loads every fixture in __fixtures__/, runs it through the REAL
 * solveLayoutV2() (the production pipeline, post Phase 0/1 changes —
 * not a standalone normalizer), and reports I1–I7 pass/fail per fixture.
 *
 * This is a BASELINE run, not a gate: the current engine (zones.ts +
 * treemap.ts) is known to produce invariant violations — see Part F /
 * the two real-brief runs that surfaced EXTERNAL_WALL and
 * CORRIDOR_ADJACENCY failures. Phase 3's constraint solver must beat
 * whatever pass rate this run records. Only a fixture failing to load,
 * or solveLayoutV2() throwing outright, fails the harness itself.
 *
 * Usage: npm run harness
 * ═══════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { solveLayoutV2 } from "../index";
import { buildGraph, HiveRoom } from "../graph";
import { runAllAssertions, AssertionResult } from "./assertions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "..", "__fixtures__");

// Same envelope/setback convention AIStudio.tsx uses in production —
// duplicated here deliberately so the harness exercises the pipeline
// exactly as a real generation would, without importing UI code.
const SETBACKS = { front: 6, rear: 3, left: 3, right: 3 };

interface FixtureOutcome {
    fixture: string;
    loaded: boolean;
    crashed: boolean;
    crashMessage?: string;
    results: AssertionResult[];
    elapsed_ms: number;
}

function loadFixtures(): Array<{ name: string; raw: any }> {
    const files = readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".json"));
    return files.map(name => {
        const text = readFileSync(join(FIXTURES_DIR, name), "utf-8");
        return { name, raw: JSON.parse(text) };
    });
}

function runFixture(name: string, raw: any): FixtureOutcome {
    const start = performance.now();
    const briefRef = raw.brief_reference ?? {};
    const plotSqm = briefRef.plot_size_sqm ?? 675; // ~15x30 fallback, matches AIStudio.tsx default
    const plotWidth = Math.sqrt(plotSqm);
    const plotDepth = plotSqm / plotWidth;
    const floors = briefRef.floors ?? briefRef.storeys ?? 1;

    const envelope = { width: plotWidth, depth: plotDepth, setbacks: SETBACKS };
    // Mirrors index.ts's own buildable-envelope formula exactly, so I1's
    // bounds match what the solver itself was constrained to.
    const buildableEnvelope = {
        width:  Math.max(plotWidth  - SETBACKS.left  - SETBACKS.right, 8),
        height: Math.max(plotDepth - SETBACKS.front - SETBACKS.rear,  8),
    };

    try {
        const layout = solveLayoutV2(raw, envelope, { floors_override: floors });
        const graph  = buildGraph((raw.rooms ?? []) as HiveRoom[]);
        const results = runAllAssertions(layout, graph, buildableEnvelope);
        return {
            fixture: name, loaded: true, crashed: false,
            results, elapsed_ms: performance.now() - start,
        };
    } catch (err: any) {
        return {
            fixture: name, loaded: true, crashed: true,
            crashMessage: err?.message ?? String(err),
            results: [], elapsed_ms: performance.now() - start,
        };
    }
}

function printTable(outcomes: FixtureOutcome[]): void {
    console.log("\n=== SOLVER V2 · FIXTURE HARNESS · BASELINE RUN ===\n");
    for (const o of outcomes) {
        if (o.crashed) {
            console.log(`✗ ${o.fixture} — CRASHED: ${o.crashMessage} (${o.elapsed_ms.toFixed(0)}ms)`);
            continue;
        }
        const passCount = o.results.filter(r => r.pass).length;
        console.log(`\n${o.fixture} — ${passCount}/${o.results.length} invariants passed (${o.elapsed_ms.toFixed(0)}ms)`);
        for (const r of o.results) {
            const mark = r.pass ? "PASS" : "FAIL";
            console.log(`  [${mark}] ${r.invariant} — ${r.detail}`);
        }
    }

    const totalFixtures   = outcomes.length;
    const crashedFixtures = outcomes.filter(o => o.crashed).length;
    const totalInvariants = outcomes.reduce((s, o) => s + o.results.length, 0);
    const passedInvariants = outcomes.reduce((s, o) => s + o.results.filter(r => r.pass).length, 0);

    console.log(`\n=== SUMMARY ===`);
    console.log(`Fixtures: ${totalFixtures} (${crashedFixtures} crashed)`);
    console.log(`Invariants: ${passedInvariants}/${totalInvariants} passed`);
    console.log(`This is the baseline the Phase 3 constraint solver must beat.\n`);
}

function main(): void {
    const fixtures = loadFixtures();
    if (fixtures.length === 0) {
        console.error(`No fixtures found in ${FIXTURES_DIR}`);
        process.exit(1);
    }

    const outcomes = fixtures.map(f => runFixture(f.name, f.raw));
    printTable(outcomes);

    // Harness fails ONLY on a genuine crash (fixture didn't produce
    // geometry at all) — invariant failures are the expected baseline
    // signal in Phase 2, not a build-breaking condition yet.
    const anyCrashed = outcomes.some(o => o.crashed);
    process.exit(anyCrashed ? 1 : 0);
}

main();
