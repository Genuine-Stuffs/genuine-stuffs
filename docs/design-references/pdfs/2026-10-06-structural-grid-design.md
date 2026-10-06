# Design for approval: lay out on a structural grid first

**Date:** Tuesday 6 October 2026 · **Author of record:** Samuel Edu, with Claude (Opus 5.5)
**Status:** PROPOSED. No code until the owner approves §6.
**Feasibility study:** pipeline step 2 (constraint layer: "structural grid"), step 5 (multi-floor coordination: "load-bearing walls align… where most tools cheat"), hard problem 2 (metric accuracy). Ledger §0 and §5b.

---

## 1. The problem

Large villas always end in a scattered compromise plan. hive-004/005/006/007 fall back on 20 of 20 seeds, with 12–16 flagged compromises each (sweep 2026-10-06). Tweaking the search has been tried and ruled out (ledger §5): a 10× time budget, backjumping, relaxing the foyer limit, the office-window preference, rotating rooms.

On top of that, nothing makes upper-floor walls sit on anything. `structural.ts` derives columns **after** the layout, from wherever the rooms landed, so a failed plan produced 91 scattered columns.

## 2. What the target drawing does

The CAD target (`images/Screenshot 2026-06-25 at 10.18.16 AM.png`) is drawn on a grid:
- column lines A–C, two 6 m bays;
- row lines 1–5, at 4.3 / 3.2 / 4.5 / 5 m.

Every room fills whole grid cells, or part of one split by a partition (bath + store). The hall is the space between rooms. The first floor uses the same lines, so its walls sit on the beams below.

## 3. Why it should help (measured on hive-007, ground floor)

| | Placements a room can take |
|---|---|
| Today: every 0.5 m shape within ±10% area × every position | **62,578** in total (upper bound: the solver's anchor pruning cuts this, but it is still the space it backtracks in) |
| Grid 4.5 / 4.5 / 3.5 / 3.5 × 4.5 / 4.5 / 3.0 / 4.5 m: whole-bay rectangles within −20%/+30% of area | **77** in total; the Guest Bathroom gets **0**, so rooms smaller than a bay must be able to share one (rule 3) |

That's roughly 800× fewer choices per room before pruning, and every choice is structurally sensible. **This is a prediction, not a result.** The June circulation-first rewrite was also reasonable on paper and was reverted (ledger §5).

## 4. The proposal

1. **Choose the grid first.** For each footprint candidate, pick column and row spacings from {3.0, 3.5, 4.0, 4.5 m} (≤ 4.5 m, the NBC typical-residential span in `compliance_rules.json`), summing to the footprint's size. A few grids per footprint replace today's footprint-only portfolio.
2. **Rooms take whole bays.** A room's candidates are rectangles whose edges lie on grid lines. A room may cross a grid line in one direction (a beam over its ceiling). It may contain an interior column (cross lines in both directions) only if the Hive flags it `uses_intermediate_columns` (garage, living lounge, master suite).
3. **Small rooms share a bay.** Baths, wardrobes, pantry, office: one bay is split by non-structural partitions. This extends the existing suite subdivision (`subdivideSuite`, `search.ts`) to any small rooms that must touch.
4. **The hall is what's left.** No corridor strip is placed. The cells not given to rooms form the hall, and the existing reachability check (I8) proves every room opens onto it. A fill floor (today's 75%) stops the hall swallowing the plan.
5. **Same grid on both floors.** The ground floor's grid is passed up the same way the stair void is now (I7). Every upper-floor wall lies on a grid line, i.e. on a beam. A new harness check, **I10_WALLS_ON_GRID**, enforces it.

**What stays:** the custom TypeScript backtracking search, units and suites, ordering, the relaxation ladder, the fallback with flagged compromises, I1–I9, the Hive JSON contract. It's still rectangles on the 0.5 m grid, because bay sizes are multiples of 0.5 m. D1–D8 are untouched. Only the candidate generator, the footprint/grid choice and the circulation step change.

**What becomes possible later:** `structural.ts` places columns at grid intersections (forwards, not backwards). Grid bubbles A/B/C and 1/2/3 and per-bay dimension chains in the drawing (§5b drawing gaps) come almost free.

## 5. How it is measured (owner's rules)

- Built **next to** the current solver behind `layoutMode: 'grid' | 'free'` (default `free`). Nothing changes for users until the grid wins.
- Same 20-seed sweep, both modes, hive-001 to hive-007. Harness first and last.
- **It becomes the default only if** all of these hold:
  - hive-001/002 still solve 20/20, pass every rule, and keep the garage and foyer on the front;
  - at least one villa moves from fallback 20/20 to strict or relaxed on most seeds;
  - villa time does not get worse than ~9 s;
  - I10 passes on every solved plan.
- **Stated prediction:** hive-001/002 unchanged; hive-007 strict/relaxed on ≥ 10/20; villa time under 3 s. If that's wrong, it gets reported as wrong.
- Rendered and compared side by side with the target drawing before anything is pushed.

## 6. Decisions needed from the owner

1. **Bay size cap:** 4.5 m (NBC table, as proposed), or allow up to 6 m like the target drawing, with deeper beams?
2. **Hall:** leftover cells (proposed), or always one dedicated hall bay down the middle, as in the target?
3. **Small rooms sharing a bay** behind a non-structural partition: acceptable?
4. **Order:** prototype the ground floor first and measure it before doing the upper floor (proposed)?

Estimated effort: the ground-floor prototype plus measurement takes one to two sessions; the upper floor and I10 one more.
