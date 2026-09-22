# AI Studio Solver — Continuation Plan

**Date:** 2026-09-22
**Author of record:** Samuel Edu, with Claude (Sonnet 5)
**Purpose:** Pick up exactly where today's session left off. Read this first before touching solver code tomorrow.

---

## 1. TL;DR

- The bug you reported today ("AI Studio no longer generates anything") is **fixed and confirmed live in production**. Root cause was the backend `ai-studio` edge function, not the solver.
- Along the way we found and fixed **4 real bugs** in the client-side placement solver, all deployed. Test-fixture success rate went from ~0% / 75% to 85–90%.
- **One class of design still reliably fails**: large, highly-constrained room programs (big multi-bay rooms + many external-wall-needing rooms + a dense adjacency hub). Two targeted fixes today did not solve it — this needs real algorithmic work, not another patch. That's tomorrow's task.
- Two real-world reproduction cases are now committed as test fixtures: `hive-004-large-villa-v1.json` and `hive-005-large-villa-v2.json`. **Start here tomorrow.**
- Separately, still pending and unrelated to the above: wiring `solveLayoutVariants()` (multiple floor-plan options from one prompt) into the actual AI Studio UI — the original product goal before this whole debugging detour.

---

## 2. What shipped today (all deployed, in order)

| Commit | What | Where |
|---|---|---|
| `ce4016a` | Fixed `deriveSuites()` mislabeling a room as a bedroom based on its *name* (e.g. "Master Bathroom") instead of its `type` | `engine_v2/graph.ts` |
| `e05f8ea` | Fixed unit placement order to respect must-touch adjacency, not just room area — large unconstrained rooms were boxing out adjacency-critical ones | `engine_v2/solver/search.ts` (`orderUnits`) |
| `08d9d3e` | Fixed suite subdivision giving the exterior wall to the wrong sub-room (bath/wardrobe instead of the bedroom that actually needs it) | `engine_v2/solver/search.ts` (`subdivideSuite`) |
| `754caf6` + `2fc4cfe` | Added footprint **portfolio search** — try multiple shape/pattern candidates + seed retries and keep whichever solves, instead of committing to one RNG-picked footprint. Added `solveLayoutVariants()` for future multi-option UI. | `engine_v2/shapes.ts`, `engine_v2/index.ts` |
| `85ca6fc` | **The actual reported bug.** Backend never enforced `response_format: json_object` on the OpenRouter call despite a comment claiming it did — model could (and did) return prose with no JSON, so `solvedLayout` never got attached to anything, and the floor plan silently rendered nothing | `supabase/functions/ai-studio/index.ts` — **deployed via `supabase functions deploy ai-studio`** |
| `ad43d02` | Fixed multi-bay `HARD`-mode rooms (`uses_intermediate_columns: true`) being placed at a *fraction* of their declared area — `span_m` is the structural bay span, not the room's true depth; now derives depth from `area_m2 / width_m` instead | `engine_v2/solver/candidates.ts` |
| `8cdfb63` | Added the two reproduction fixtures described below (test data only, not yet pushed — see §6) | `engine_v2/__fixtures__/` |

**Validated fixture pass rates** (20-seed sweeps, `npm run harness`):

| Fixture | Before today | After today |
|---|---|---|
| `hive-001` (single-floor, T-shape) | 0/20 | 17/20 (85%) |
| `hive-002` (duplex) | 15/20 (75%) | 18/20 (90%) |

**Live production verification:** deployed backend fix confirmed via a real generation — response went from `{ data: null }` to a fully populated design (24 rooms, material schedule totaling ₦67,253,000, NBC 2006 compliance pre-screen with 47 checks passed). This is the part that matters most: **the product works again.**

---

## 3. The open problem

Two real user prompts (same brief, two separate generations — numbers differ slightly between them, which is itself informative, see below) both produce a ground floor that **never solves**, even after the fixes above.

### The reproduction fixtures

- `src/lib/aec/solver/engine_v2/__fixtures__/hive-004-large-villa-v1.json`
- `src/lib/aec/solver/engine_v2/__fixtures__/hive-005-large-villa-v2.json`

Run them directly:
```bash
npm run harness   # runs all fixtures including these two
```

Both show **0/10 solved** across a seed sweep at the currently deployed budget. Ground floor shape, for reference:

- 9 placeable units (foyer, living, dining, kitchen, wet kitchen, guest suite, office, garage — corridor/stairwell excluded as fixed reserved geometry)
- ~188.5m² of room area needed against ~311m² available in a plain rectangle footprint (**not an area problem** — feasibility gate correctly passes this)
- Nearly every unit needs external-wall access (only the wet-kitchen-adjacent sub-rooms don't)
- A 5-way adjacency hub at the foyer (r01 connects to r02, r03, r04, r05, r10)
- 2–3 large `HARD`-mode rooms (living room 40.5m², garage 54m², master bedroom 50m² on floor 1) — each locked to one exact rectangle shape by the structural column constraint

### What was tried today and the results (read before re-attempting either)

1. **Depth-derivation fix** (`ad43d02`, kept, deployed) — real, independent bug fix. Helped in general (see fixture pass rates above) but **did not solve this specific case**.
2. **Rotation for HARD-mode rooms** (tried, reverted — not committed, not deployed) — allowing both `w×h` and `h×w` orientations for multi-bay rooms. Structurally this seemed safe (same bay spacing, just a different orientation against the global grid). Measured result: **made things worse** — 0/8 solved at 12s budget, down from 2/8 before the change. More candidate orientations per room increased the branching factor enough to slow the search down within a fixed time budget, even though in principle more options should only help given unlimited time.
3. **10x time budget** (1200ms → 12000ms, tested directly against `solvePlacement()`, not the full portfolio) — barely moved the needle (0-2/8 either way). This is the important negative result: **it is not primarily a time-budget problem.**

**Conclusion:** the bottleneck is the backtracking search itself running out of good moves, not insufficient candidates or insufficient time. Naively adding more of either doesn't help and can hurt. Tomorrow's fix needs to change *how* the search explores, not just *how much* it explores.

---

## 4. Why this is probably hard (analysis, not yet verified against instrumentation)

The current search (`engine_v2/solver/search.ts`) is a plain chronological depth-first backtracking search:
- Fixed unit ordering (hub-first, then BFS through must-touch edges, then area-descending) — decided once, up front, never revisited based on how constrained a unit turns out to be at solve time.
- Chronological backtracking only — when unit N fails completely, it backtracks exactly one level (unit N-1), not to whichever earlier unit's choice actually caused the dead end. With a 5-way adjacency hub and several large fixed-shape rooms, the *real* conflict is often several levels back, so the search wastes enormous effort retrying combinations of unrelated later units before ever revisiting the actual problem choice.
- Candidate pruning is just a suffix-sum area check (`freeCells < minAreaSuffix[i]`) — cheap, but doesn't detect "the remaining perimeter can't fit the remaining external-wall-needing rooms," "these two units' must-touch requirement is geometrically impossible given what's already placed," etc.

This combination (dense constraints + large fixed-shape pieces + no lookahead beyond area) is a known hard case for plain backtracking in the CSP/rectangle-packing literature. It's very plausible this is fine for small-to-medium room counts (which is most of what we tested and fixed today) and degrades sharply past a certain complexity threshold — consistent with everything observed today.

---

## 5. Candidate directions for tomorrow ("smarter search heuristics")

Roughly in order of expected effort-to-payoff, not a strict recommendation — worth re-assessing once you're back in the code:

1. **Most-constrained-variable (MRV) dynamic ordering.** Instead of a fixed order decided up front, at each step pick whichever *unplaced* unit currently has the fewest viable candidates (given what's placed so far), not a static hub/area heuristic. Classic CSP technique, often a large win for cheap implementation cost.
2. **Conflict-directed backjumping.** When a unit exhausts all candidates, jump back to the *specific* earlier unit whose placement is implicated (e.g., the one it has a must-touch pair with, or whose placement ate the last viable perimeter segment) instead of just the immediately preceding one. Needs a way to track *why* a unit failed, not just *that* it failed.
3. **Stronger forward-checking / constraint propagation.** Before recursing into a unit, check more than raw area: e.g., sum remaining perimeter length against remaining external-wall-needing units' minimum widths; check must-touch pairs between two *unplaced* units aren't already geometrically contradictory given placed geometry.
4. **Local-search fallback for genuinely hard cases.** If exact backtracking exhausts its budget, fall back to a stochastic local search (simulated annealing / large-neighborhood search) that accepts a placement with minor, flagged violations rather than returning nothing. This changes the failure mode from "blank floor plan" to "here's a plan, review these 2 flagged issues" — arguably a better product experience regardless of how far the exact-search improvements get.
5. **Warm-start candidate ordering.** Currently unconstrained units get pure-random candidate order. A cheap greedy pre-pass (e.g., first-fit-decreasing by area, or placing large units toward corners first) could bias the search toward likely-feasible branches from the start instead of relying on backtracking to find them.
6. **Revisit "every room needs external wall" as a hard requirement.** Confirm with the product/compliance side whether some room types (office, in this fixture) could tolerate no window as a flagged *warning* rather than a hard placement constraint — this is a rules relaxation, not an algorithm change, but would directly shrink this specific case's constraint density.

**Do not re-attempt** naive rotation-for-all-candidates or blind budget increases without also changing the search strategy — both were tried today and measured neutral-to-negative.

---

## 6. Also still pending (unrelated to the above, lower urgency)

- `solveLayoutVariants()` exists and is tested (confirmed to return multiple genuinely distinct floor plans), but nothing in the frontend UI calls it yet. This was the original product ask ("array of choices from one prompt") before the generation bug took priority. `AIStudio.tsx` still only calls `solveLayoutV2()` and renders a single result.
- The fixture commit (`8cdfb63`) has **not been pushed** to `origin/main` yet — everything else through `ad43d02` is pushed and live; the two new fixtures are local-only until you push again.

---

## 7. Quick-start checklist for tomorrow

1. `cd ~/projects/genuine-stuffs && git pull` (or just resume the sandbox — check `git log --oneline -5` matches this doc's commit table).
2. `npm run harness` — confirm `hive-004-large-villa-v1` and `hive-005-large-villa-v2` still show 0/N solved (baseline unchanged).
3. Push `8cdfb63` if it isn't already on `origin/main`.
4. Start with MRV ordering (§5.1) — smallest, most self-contained change, easiest to measure in isolation against the two fixtures above before touching anything else.
5. Re-run the harness after each change — don't stack multiple heuristic changes before measuring, or you won't know which one helped (or hurt, per the rotation lesson from today).
