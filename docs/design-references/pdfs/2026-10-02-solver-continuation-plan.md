# AI Studio Solver — Continuation Plan

**Date:** 2026-10-02
**Author of record:** Samuel Edu, with Claude (Opus 5.5)
**Supersedes:** `2026-09-22-solver-continuation-plan.md` (kept for history — its §3–§4 analysis is still useful background)
**Purpose:** Pick up where the 2026-10-01/02 sessions left off. Read this first before touching solver code.

---

## 1. TL;DR

- Since the Sep 22 plan: **6 commits**, `7b30722` → `b84c902` (tip). hive-001 and hive-002 now solve **20/20, rule-clean**, under a stricter harness (I1/I5 fixed, new I8). hive-004 went from **0/20 → 8/20**.
- **hive-005 still solves 0/20.** The harness labels it "UNSAT (proven)", but **that label is not a proof** (see §4). Fix the labelling before drawing conclusions from it.
- The Sep 22 plan blamed the search strategy. Most of the gain actually came from **geometry and input-data bugs** that made the perimeter or the floor unusable (§2). MRV helped with speed, but on its own it did not unlock hive-004/005.
- Still pending and unrelated: wiring `solveLayoutVariants()` into `AIStudio.tsx`. This was the original product ask, and no progress has been made on it.

---

## 2. What shipped since Sep 22 (in order)

| Commit | What | Where |
|---|---|---|
| `7b30722` | Harness checked I1/I5 against the **plot**, not the building, so I5 credited only the top/left walls. `SolvedLayout` gains optional `building_width`/`building_depth`. On `SOLVED_RELAXED`, I3 checks hub edges only. | `__harness__/assertions.ts`, `types.ts` |
| `db2d0d6` | Grid sized with `Math.round`, which overshot the footprint, so the **right/bottom walls were unusable**. The off-grid ground corridor made ~half of "solved" hive-001/002 layouts overlap it (I2). Grid now rounds down, footprints snap inward, and reserved rects cover every touched cell. | `grid.ts`, `index.ts`, `solver/search.ts` |
| `ad9b6a8` | **MRV dynamic unit ordering + forward checking** (Sep 22 §5.1, plus part of §5.3). An O(1) summed-area overlap test was added. hive-001 1.0s → 0.3s, hive-002 0.8s → 0.1s. Strict SOLVED 29/40 → 37/40. | `solver/search.ts`, `grid.ts` |
| `ed84d98` | Design-reference index, images and PDFs. | `docs/design-references/` |
| `49255a7` | `normalizeRoomType()`: the Hive sends free text ("master bedroom"), so hive-004/005's master suite was never derived. | `graph.ts` |
| `b84c902` | **Corridor and stairwell are now search units**, replacing a fixed full-width band (which used 25.5m² against a declared 7.5m² and split the ground floor in two). Reachability is a hard constraint (new invariant **I8**). Wardrobes and stores need no window (`NO_WINDOW_TYPES`). Suite strips can run along any side. Candidate lists update incrementally (~7× nodes/s on hive-004). Interior must-touch units now fail the branch instead of being deferred. Planarity fail-fast ignores edgeless units. | `solver/index.ts`, `solver/search.ts`, `graph.ts`, `placement_validator.ts`, `__harness__/assertions.ts` |

### Pass rates (20 seeds, production pipeline, 1.2s/floor, all I1–I8 checked)

| Fixture | Sep 22 | Now |
|---|---|---|
| `hive-001` (single floor) | 17/20 | **20/20** rule-clean, avg 0.08s |
| `hive-002` (duplex) | 18/20 | **20/20** rule-clean (19 strict + 1 relaxed), avg 0.37s |
| `hive-004-large-villa-v1` | 0/20 | **8/20**, all rule-clean |
| `hive-005-large-villa-v2` | 0/20 | 0/20 — ground floor still open |
| `hive-003`, `hive-101`, `hive-102` | UNSAT | UNSAT (correct, fail fast) |

The Sep 22 figures were measured under the older, looser harness (I5 masking bug, no I8). They are not like-for-like.

### `npm run harness` on 2026-10-02 (single default seed)

```
hive-001  8/8 invariants  (166ms)
hive-002  8/8 invariants  (103ms)
hive-003  UNSAT (proven)  (4ms)
hive-004  TIMEOUT         (12211ms)   ← consistent with 8/20
hive-005  UNSAT (proven)  (7207ms)    ← label is misleading, see §4
hive-101  UNSAT (proven)  (2ms)
hive-102  UNSAT (proven)  (1ms)
Invariants: 16/16 passed, 0 crashed
```

---

## 3. Status of the Sep 22 candidate directions

| Sep 22 §5 item | Status |
|---|---|
| 5.1 MRV dynamic ordering | ✅ Done (`ad9b6a8`) |
| 5.2 Conflict-directed backjumping | ❌ Not started |
| 5.3 Stronger forward checking | 🟡 Partial. Perimeter-bound units (`ad9b6a8`) and interior must-touch units (`b84c902`) are covered. No perimeter-length vs. remaining-window-rooms check yet. |
| 5.4 Local-search fallback | ❌ Not started |
| 5.5 Warm-start candidate ordering | ❌ Not started |
| 5.6 Relax "needs external wall" for some types | 🟡 Partial. Wardrobes and stores are exempt. The office is still a hard requirement; this needs a product/compliance decision. |

The "do not retry" list from Sep 22 still holds. Rotation for all HARD-mode candidates and blind budget increases were measured as neutral-to-negative.

---

## 4. Open problem 1: hive-005's "UNSAT (proven)" is not a proof

The harness prints "UNSAT (proven)" whenever `layout.solver_status === 'UNSAT'` (`__harness__/run.ts:99`). That status is not a proof, for three reasons:

1. **`solver/relax.ts:104`** sets `UNSAT` whenever the relaxation ladder finishes before `budget_ms - 50`. In other words, it means the search ran out of options early, not that it proved infeasibility.
2. The options it ran out of are **incomplete by construction**. Room shapes are capped at `MAX_DIMENSION_PAIRS = 12` with `MAX_ASPECT = 3.0` (`solver/candidates.ts:30–31`). Since `b84c902`, interior must-touch units also fail a branch when their anchored options run out. Exhausting this set means "no solution among the candidates we generated", not "no solution exists".
3. **`solveLayoutV2` returns the last attempt's status** (`index.ts:299`, `successes[0] ?? lastAttempt`). It does not aggregate over the footprint portfolio. If any earlier footprint timed out, the reported UNSAT hides it.

Only the **feasibility gate** (`solver/index.ts`, `checkFeasibility`) and the **planarity fail-fast** (`relax.ts`) produce genuine proofs. That is why hive-003/101/102 return in a few milliseconds.

**Next steps:**
- Split the status into proven UNSAT (gate/planarity) and `EXHAUSTED` (candidate set ran out), or carry a `proven: boolean` in diagnostics. Have the harness print the difference.
- Aggregate the status across the portfolio: TIMEOUT if any attempt timed out, otherwise EXHAUSTED, and UNSAT only if every attempt was proven.
- Then instrument hive-005's ground floor. Find which unit runs out of options most often (`failedUnitIds`) and whether the cap of 12 dimension pairs is what cuts it off. If a single room causes it, the fix may be on the candidate side (more shapes for that room) or the program side, not the search.

---

## 5. Open problem 2: hive-004 at 8/20

It now solves sometimes, so this is a search-efficiency problem. Remaining ideas, in order of expected payoff:

1. **Conflict-directed backjumping** (Sep 22 §5.2). This is the main untried search idea. `failedUnitIds` already exists. Extend it to record *which placed units* removed the failing unit's last options, then jump back to the most recent one.
2. **Perimeter-capacity forward check** (rest of Sep 22 §5.3). Compare the remaining free perimeter length against the minimum widths of the remaining window rooms, and fail the branch early if they can't fit.
3. **Local-search fallback** (Sep 22 §5.4). When exact search fails, return a plan with flagged violations instead of a blank floor. This is a product win regardless of 1–2.

Measure each change separately with 20-seed sweeps on hive-001/002/004/005. Don't stack changes before measuring (lesson from Sep 22).

---

## 6. Still pending (product, unrelated to the solver)

- `solveLayoutVariants()` (`engine_v2/index.ts:306`) returns multiple distinct plans but has **no caller**. `AIStudio.tsx` still calls `solveLayoutV2()` and renders one result. Wire it into the UI so one prompt yields a choice of plans. This was the original ask.
- Decide with the product/compliance side whether the office (and similar rooms) may go without a window as a flagged warning (Sep 22 §5.6).

---

## 7. Quick-start checklist

1. `git log --oneline -1` should show `b84c902` or a later commit that updates this doc.
2. `npm run harness`. The baseline should match §2: hive-001/002 pass 8/8, hive-004 TIMEOUT or solved, hive-005 "UNSAT".
3. Start with **§4**: make the solver say what it actually knows (proven vs. exhausted vs. timeout). It's small and self-contained, and it decides what to do about hive-005.
4. Then §5.1 (backjumping) against hive-004, measured alone.
5. Update this doc at the end of the session, or write a new dated one.
