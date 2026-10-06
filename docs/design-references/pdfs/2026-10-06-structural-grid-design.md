# Design for approval: lay out on a structural grid first

**Date:** Tuesday 6 October 2026 · **Author of record:** Samuel Edu, with Claude (Opus 5.5)
**Status:** APPROVED by the owner 2026-10-06, with every recommendation in §6. Prototype: ground floor first, behind a flag.
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

## 6. Decisions (owner, 2026-10-06: all as recommended)

1. **Bay size cap:** 4.5 m (NBC table, as proposed), or allow up to 6 m like the target drawing, with deeper beams?
2. **Hall:** leftover cells (proposed), or always one dedicated hall bay down the middle, as in the target?
3. **Small rooms sharing a bay** behind a non-structural partition: acceptable?
4. **Order:** prototype the ground floor first and measure it before doing the upper floor (proposed)?

Estimated effort: the ground-floor prototype plus measurement takes one to two sessions; the upper floor and I10 one more.

---

## 7. Results: prototype step 1 (ground floor, whole-bay candidates), 2026-10-06

**The prediction was wrong. Step 1 is worse than the current solver. The switch stays off.**

20 seeds each. "Ground only" = same brief and storeys, upper-floor rooms removed, to isolate the ground floor.

| | Free (current) | Grid step 1 |
|---|---|---|
| hive-007, ground only | 14 relaxed, 6 fallback, 6.7 s | **0 solved, 20 fallback**, 2.6 s |
| hive-004/005/006, ground only | fallback 20/20 | fallback 20/20 (faster: 1.6–3.1 s) |
| hive-001, full | 10 strict + 10 relaxed, 0.28 s | 12 strict + 6 relaxed + **2 fallback**, 2.07 s |
| hive-002, full | 19 strict + 1 relaxed, 0.12 s | 0 strict + 20 relaxed, 0.53 s |
| Villas, full: flags per plan | 12–15 | **16–20** |

**Why (hive-007, candidate counts at the search root):** the strict search fails as UNSAT, not by timing out, because some rooms have **zero** candidates before the search starts:
1. **Garage (HARD 9 m wide): 0 on most grids.** Bays were chosen from the footprint alone (e.g. 3.5/3.5/4/3.5 m); no run of bays is 9 ± 1 m. The grid must be chosen **from the program** (pinned widths: 9 = 4.5 + 4.5).
2. **Guest-bedroom suite: 0.** One 4.5 m bay minus the 2.2 m bath strip leaves 2.3 m < the bedroom's 2.7 m minimum; two bays exceed the area window. A suite's bath needs to be able to cross a bay line (a partition, not a structural wall).
3. **Wet kitchen (10 m²): 0.** Just above the small-room threshold (60% of the smallest bay), but below the area window of the smallest whole bay.

**Next (each one change, measured alone, starting with the intermediate signal "every room has ≥1 candidate at the root"):** (a) program-aware bay choice, (b) suite baths may cross a bay line, (c) small-room threshold. Not yet started; owner to confirm direction.

## 8. Results: fix (a), bays chosen from the program, 2026-10-06

Bays are now the split of each side (3.0–4.5 m) that fits the most pinned rooms (HARD width across, area-derived depth front to back, ending at the front edge for the garage/entrance); then the most even split. `bay_grid.ts`.

**Intermediate signal: strict attempts in which every room has ≥ 1 candidate at the root** (ground floor, 20 seeds):

| | Step 1 | Fix (a) |
|---|---|---|
| hive-004 | 72 / 480 | 234 / 480 |
| hive-005 | 72 / 480 | 366 / 480 |
| hive-007 | 88 / 480 | 390 / 480 |

Garage, office and wet kitchen are no longer blockers; the guest suite still is (90–206), and hive-004's foyer is new (40).

**Outcome (20 seeds):** hive-001 0 strict + 20 relaxed (free: 10 + 10), hive-002 17 strict + 3 relaxed (free: 19 + 1), **villa ground floors still 0/20** (free hive-007: 14 relaxed). **Prediction wrong again**: placeable rooms were necessary but not sufficient.

**Why: switch one rule off at a time** (hive-007 ground, grid, 8 seeds): adjacency off → 8/8 strict; outside wall off → 8/8 relaxed; front edge off → 8/8 relaxed; reach off → 0. Dropping only the foyer's neighbours → 8/8; dropping only the living–dining–kitchen–pantry chain → 8/8. **The two together, with every room on an outside wall and the foyer + garage on the front, don't fit when every room is a whole bay**: a one-bay foyer has three free sides, and each whole-bay neighbour takes a whole side.

**Diagnostic, not committed: partitions on bay midlines** (rooms may use the line through the middle of a bay too; structural lines unchanged), 8 seeds: hive-007 ground **5 relaxed / 3 fallback** (≈ free's 14/20); hive-004/005 still 0. **At best it matches the current solver on the ground floor; no evidence yet that it solves the villas.**

**Assessment:** the grid's case for *solving* villas is not supported by these measurements. Its remaining case is structural and drawing quality (walls on beams, grid bubbles, dimension chains), which only pays off once it at least matches the free solver. Owner to decide the direction (see the session report).

## 9. Results: partitions on bay midlines (the capped last step), 2026-10-06

Owner's direction: try partitions through the middle of bays, following the building code; if the grid doesn't then beat the current solver on whole briefs, park it.

**Change (flag still off):** rooms not pinned to a structural width may also end on a bay's midline (a non-structural partition; `withMidlines`, `bay_grid.ts`). Structural lines are unchanged, so no beam spans more than 4.5 m. Because partitions can make narrower rooms, every room the grid places must also meet the NBC 2006 minimum area and width in `compliance_rules.json` (`meetsNbcMinimums`, `room_shape.ts`). Variants such as guest_bedroom, wet_kitchen and sunken_lounge count as their base type. The stair (a fixed shape, 1.2 m clear-width rule) and setbacks are untouched.

**Prediction:** hive-007 ground 10–13/20 relaxed; hive-004/005 0/20; whole briefs no better than free.

**Measurement note:** the first sweep ran 16 processes on 4 cores, and free mode (unchanged code) dropped from hive-002 19 strict to 5. That sweep was discarded and rerun 3 at a time; free then matched its earlier numbers.

20 seeds:

| | Free (current) | Grid + midlines |
|---|---|---|
| hive-007, ground only | (14 relaxed, §7) | **1 relaxed**, 19 fallback, 3.3 s |
| hive-004/005/006, ground only | fallback 20/20 | fallback 20/20 |
| hive-001, full | 9 strict + 11 relaxed, 0.31 s | **20 strict**, 0.04 s |
| hive-002, full | 19 strict + 1 relaxed, 0.15 s | **20 strict**, 0.11 s |
| Villas 004–007, full | fallback 20/20, 12–16 flags, 1.6–9.2 s | fallback 20/20, **18–21 flags**, 1.6–4.2 s |
| Rooms under the NBC minimum | hive-006: 24 | hive-006: 22 (all the brief's 10 m² "Master Suite Lounge", typed living; NBC living ≥ 12 m²); 0 elsewhere |

**Prediction wrong.** The earlier 8-seed diagnostic (5/8 on hive-007 ground) does not reproduce. Switching the NBC check off gives the identical 1/20, so the code check is not the cause. That diagnostic's exact variant wasn't kept.

**Decision, per the owner's cap: the grid is parked.** It doesn't beat the free solver on any villa, and its fallback plans carry more compromises. The code stays in, behind `layoutMode: 'grid'` (default `free`).

**One positive result:** on the small houses the grid solves strictly on 20/20, against free's 9 and 19 strict. It is also faster.

## 10. What must be in place before the grid is switched on

These are the §5 rules plus what this work showed. All must hold on a 20-seed sweep, run at most 3 at a time on this machine, with the harness first and last:

| # | Condition | Status now |
|---|---|---|
| 1 | At least one villa (hive-004–007) solves strict or relaxed on ≥ 11/20 seeds on the **whole brief** | ✗ 0/20 on all four |
| 2 | Villa fallback plans have no more flagged compromises than free's | ✗ 18–21 against 12–16 |
| 3 | hive-001/002 solve 20/20, pass every rule, garage and foyer on the front | ✓ 20/20 strict |
| 4 | Villa time ≤ ~9 s | ✓ 1.6–4.2 s |
| 5 | **Upper floor on the same grid**, with harness check **I10_WALLS_ON_GRID** passing on every solved plan (upper walls on beams) | ✗ not built (grid is ground floor only) |
| 6 | **Building code:** every room meets NBC minimum area/width (✓ enforced in grid mode); no structural span over 4.5 m (✓ by construction); stair ≥ 1.2 m clear (✓ unchanged); upper-floor partitions **off** the structural lines are non-load-bearing, i.e. lightweight block on the slab, and shown as such in the structural spec, or else upper-floor walls are kept to structural lines | Partly: the upper-floor rule is open, with #5 |
| 7 | `structural.ts` places columns at grid intersections instead of deriving them after layout | ✗ not built |
| 8 | Plans rendered side by side with the target drawing before anything is pushed | ✗ not done |

**Partial option for the owner, not started:** use the grid only where it wins. Try grid first, and fall back to free if grid falls back. That would bank the small-house gain (#3/#4) without #1/#2, but it still needs #5–#8 for the structural benefit.
