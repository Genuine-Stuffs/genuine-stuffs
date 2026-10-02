# AI Studio Solver: Continuation Plan (end of day, Friday 2 October 2026)

**Author of record:** Samuel Edu, with Claude (Opus 5.5)
**Supersedes:** this morning's version of this file, and `2026-09-22-solver-continuation-plan.md`
**Resume:** Monday 5 October 2026, from exactly this point.
**Read first:** this file, then `docs/development/PROJECT_LEDGER.md` (policies, ruled-out approaches, gap list §5b).

---

## 1. Where we stopped

- **Everything is pushed.** `main` = `origin/main` = `5642012`. The working tree is clean, apart from `supabase/.temp/cli-latest`, local CLI noise that is never committed.
- **A breakage was reported after the last deploy; see §1b, which comes first.** Then Samuel will send new AI Studio screenshots taken on the live site after today's deploy. Compare them against the target drawing (`images/Screenshot 2026-06-25 at 10.18.16 AM.png`) **before** changing anything, and update the gap list in ledger §5b from what they actually show.
- **Not yet verified on the live site:** today's last 8 commits (`f6c6e18`…`5642012`) were checked with the harness, 20-seed sweeps and server-rendered SVGs, but not in a logged-in browser. The screenshots are that check.

---

## 1b. ⚠️ FIRST ON MONDAY: the owner reports a breakage on the live site

Reported Friday evening, after the 8-commit deploy (`f6c6e18`…`5642012`, pushed ~6 pm): "the current changes broke something". The owner took a screenshot and copied the browser console, but **neither had reached the VM at shutdown**, so the symptom is still unknown.

**Investigated Friday night, once the console arrived** (the screenshot hadn't):
- **Not a crash.** The console shows a 23-room villa brief that ends in a fallback plan with 16 flagged compromises:
  - ground floor solves relaxed, but the upper floor times out on every strict footprint;
  - the fallback then flags the garage, master suite and bedrooms as unreachable or without an outside wall.
  The WebGL error is the browser's disabled GPU, as before.
- **Bisected with the exact brief** (saved as fixture `hive-007-live-villa-2026-10-02-evening.json`, 6 seeds per version): **it falls back at every version since before the deploy.**

  | Version | Result | Time |
  |---|---|---|
  | `8ae51e6` (live before the deploy) | Fallback | 15.7 s |
  | `b45cbde` (proportions) | Fallback | 15.1 s |
  | `c4e648f` (entrance) | Fallback | 10.8 s |
  | `8fe41f2` (sizing) | Fallback | 17.6 s |
  | HEAD (with the 6 s cap) | Fallback | **8.5 s** |

  So the solver did **not** regress on this brief, and the deploy made it faster.
- **Hard invariants pass** on it (and on the earlier live villa brief, now fixture `hive-006-live-villa-foyer-degree7.json`), all seeds. Harness 162/162. The geometry is valid.
- **Conclusion:** whatever looks broken is in what is DISPLAYED, or is the plan's quality (16 compromises on a villa), not invalid geometry. **The screenshot is needed to say which.** Candidates to check against it:
  - the compromise banner / Placement Notes panel;
  - how a fallback plan renders, e.g. an unreachable garage mid-plan, the master suite with no corridor access;
  - the 12-room partial results logged before the fallback (are they ever shown?);
  - the structural grid now generating 91 columns where a failed plan used to give 0.

**On Monday:**
1. Get the screenshot uploaded (the console is already analysed above). Paste any NEW console output into chat, and the screenshot uploaded with `scp -P 22 "/Users/EduPc/Desktop/Screenshot …png" root@2.29.17.102:/root/projects/genuine-stuffs/docs/design-references/images/`. This worked on Friday with the full quoted path.
2. **Diagnose before changing anything.** Reproduce with the brief from the console's `[SOLVER_DEBUG] Raw rooms from Hive` JSON, using `__harness__/render.tsx` and the harness.
3. Suspects, from the deploy, in rough order of risk:

| Commit | What could break |
|---|---|
| `8fe41f2` (footprint sized to program) | A smaller building that a brief can't fit; F-002/F-001 rejections; odd sizes on small plots |
| `c4e648f` (entrance on front) | Briefs whose entrance can't reach the front edge now go to the fallback |
| `b45cbde` (room proportions) | Briefs that used to solve now need relaxation or fall back |
| `ef2732b` (6 s strict cap) | A slow-but-solvable brief now gets a fallback plan |
| `f6c6e18` (furniture by type) | A renderer error on an unexpected room type |
| `7269dc7` (exclusive suites) | Different suite grouping for some briefs |

If production is badly broken and the cause isn't found quickly, the safe rollback is `git revert` of the specific commit (never a force-push), then push. Ask the owner first: pushing deploys.

## 2. What shipped today (2 October), in order

| Commit | What | Evidence |
|---|---|---|
| `49255a7` | Normalize free-text Hive room types ("master bedroom" → `master_bedroom`) | Master suite now derived on hive-004/005 |
| `b84c902` | Solver places the corridor and stairwell itself; reachability enforced (I8) | hive-004 0/20 → 8/20 |
| `6cc2639` | Project ledger + first version of this plan | — |
| `5b59633` | UNSAT is only called "proven" when it is | hive-005 turned out to be a timeout, not infeasible |
| `24d4fad` | Ledger: window rules by room type (owner decision) | Office-window attempt measured and rejected |
| `ce430b4` | Scored layout options ("Option N · score · Best"), computed in a Web Worker | 3–4 options on typical briefs |
| `4e9e62a` | Ledger: backjumping and F-004 results | Both measured, neither committed |
| `d698117` | Plain-language explanation instead of a blank plan (one message per F-/S- code) | Live villa brief: "Grand Foyer has to share a wall directly with 7 rooms…" |
| `8ae51e6` | **Fallback:** always a complete plan, with every compromise flagged | Live villa brief and hive-004/005 always get a plan |
| `f6c6e18` | Furniture drawn by room type (it was keyed on opaque ids, so almost never drew) | hive-001: 10 → 18 furniture groups |
| `91c17ab` | **Harness runs fixed seeds 1–3** | Unseeded runs hid a 9-in-12 failure |
| `7269dc7` | A sub-room shared by two bedrooms goes to exactly one suite | Fixed a bug `8ae51e6` had shipped: hive-003 I4 9/12 failing → 0 |
| `b45cbde` | Room proportions per type (min width from the plan's table; max aspect 2:1 for bedrooms/living/dining/office, 2.5:1 for kitchen/foyer) | Villa dining 1.5 × 7.5 m → 5.5 × 3.5 m |
| `c4e648f` | Ground-floor entrance (foyer…) on the **front = bottom edge**; I9 | hive-002 strict 9/20 → 20/20, 0.51 s → 0.29 s |
| `8fe41f2` | **Footprint sized to the room program**, tightest first | Fill 46–54% → 75–81%; hive-002 now 12 × 15 m |
| `ef2732b` | Strict portfolio capped at 6 s before the fallback | Villas ~14 s → ~8.8 s |
| `5642012` | Ledger: gap to the target drawing + owner screenshots | — |

---

## 3. Measured state at shutdown

Harness (`npm run harness`, seeds 1–3): **126/126**.

| Fixture | Result | Time |
|---|---|---|
| hive-001 | 9/9 all seeds | ~0.1 s |
| hive-002 | 9/9 all seeds | ~0.1 s |
| hive-003 (infeasible by design) | Fallback plan, all hard checks pass | ~1.5 s |
| hive-004 | Fallback plan, all hard checks pass | ~8.8 s |
| hive-005 | Fallback plan, all hard checks pass | ~8.8 s |
| hive-101 (infeasible by design) | Fallback plan, all hard checks pass | ~0.2 s |
| hive-102 (175 m² on 54 m²) | UNSAT (proven), shows the explanation | <0.1 s |

20-seed sweeps:

| Fixture | Solved | Rule-clean | Avg time | Building | Ground fill |
|---|---|---|---|---|---|
| hive-001 | 20/20 strict | 20 | 0.07 s | 200 m² | 81% |
| hive-002 | 20/20 strict | 20 | 0.05 s | 180 m² | 75% |

The live 23-room villa brief (saved during the session as hive-006, not yet committed as a fixture) gets a fallback plan, 15.5 × 19 m, with the foyer on the front.

---

## 4. Monday: the order of work

1. **Review the owner's screenshots** against the target. Re-rank the list below by what they show.
2. **Garage on the street front.** Same mechanism as the entrance (`ENTRANCE_TYPES` / `onFront` in `solver/search.ts`, flag + I9-style check). Both targets put the garage at the front. Measure that hive-001/002 still solve 20/20.
3. **Labels that fit.** "3-Car Enclose…", "Wet Kitchen/P…": wrap or shrink the label in `AECFloorPlan.tsx` instead of truncating it.
4. **Commit the live villa brief as `hive-006` fixture** (it exists only in the session scratchpad; regenerate it from the console log the owner pasted, which has the full rooms JSON).
5. **Hall as the connected space between rooms**, not a fixed strip (the corridor unit in `solver/index.ts::buildCirculation`).
6. **Structural grid:** generate ~4–6 m bays and snap both floors to it, so upper walls stack on lower ones. This is the largest change, and design should be discussed with the owner first.
7. **Fallback quality:** villas still miss up to ~12 adjacencies.
8. **Move `solveLayoutV2` off the main thread** (the options worker pattern already exists in `hooks/use-layout-options.ts`). Villas still freeze the page ~9 s.
9. **Drawing quality** (ledger §5b): thick walls, door/window tags + schedule, dimension chains and grid bubbles, stair treads + arrow, both floors on one sheet.

---

## 5. How to work (the owner's standing rules; details in ledger §2)

- Run `npm run harness` first and last. Use 20-seed sweeps for any solver change. **Measure one change at a time.**
- **State the expected result before running.** Report results verbatim, including when the prediction was wrong.
- **To look at a plan:** `npx tsx src/lib/aec/solver/engine_v2/__harness__/render.tsx <fixture> out.svg [seed]`, then convert to PNG outside the repo (instructions in the file header).
- **Git:** commit directly on `main`, and ask before pushing (pushing deploys).
- **Don't retry** (ledger §5): office-window-as-preference, backjumping, raising F-004, rotating HARD rooms, raising the time budget.

---

## 6. Known debt (not blocking)

- 29 TypeScript errors from `tsc -p tsconfig.app.json`, all pre-existing:
  - `test_e2e.ts` imports files deleted in July.
  - `verify_phase3.ts` has a stale signature.
  - `AECBillOfQuantities` imports a missing `MaterialRequirement` type.
  - `AIStudio` has a `react-markdown` prop type error.
- `src/lib/aec/README.md` is stale, and `docs/research/dashboard_research_report.md` is empty.
- The rebuild plan's invariant numbering differs from the harness I1–I9. Use the harness names.
