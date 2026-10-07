# Project Ledger: Progress Records and Development Policies

**Compiled:** 2026-10-02, from all 683 commits (2025-11-06 → `b84c902`) and every document in the repo.
**Purpose:** A single place to check what has already been decided, tried, measured and ruled out, so sessions stop re-covering the same ground. Update it at the end of any session that changes a policy or closes a milestone.

---

## 0. Progress against the feasibility study (reviewed 2026-10-06)

Source: `AI-Floor-Plan-Platform-Feasibility.pdf`. Status words: **Done**, **Partial**, **Not started**. Update this table whenever an item moves.

**The 8-step pipeline (study §4)**

| # | Step | Status | Evidence / gap |
|---|---|---|---|
| 1 | Prompt understanding (LLM → spec + adjacency graph) | **Done** | `ai-studio` edge function emits the Hive room JSON; `graph.ts` normalizes it (D6) |
| 2 | Constraint layer (plot, setbacks, min sizes, corridors, stairs, structural grid) | **Partial** | Setbacks, min width/aspect per type, outside walls, front entrance + garage, reachability. **No structural grid**; stair is a box |
| 3 | Layout generation | **Partial** | Our own deterministic solver (D1: LLM never draws geometry, matching study problem 2). Small/medium houses 20/20; **villas always fall back** to scattered compromise plans |
| 4 | Vectorisation + dimensioning + door/window schedule | **Partial** | Overall dimensions only. No per-bay chains, no D1/W1 tags or schedule (study deliverable #2) |
| 5 | Multi-floor coordination (walls stack, stairs land) | **Partial** | Stair void mirrored (I7). **Upper walls don't stack on lower ones.** The study calls this "where most tools cheat" |
| 6 | 3D + render consistent with the plan | **Partial** | `AECMassingView` massing + an image render call; consistency with the plan not verified |
| 7 | Edit loop: a new prompt mutates the stored spec, re-renders only what changed | **Not started** | A follow-up regenerates from scratch with a new random seed (`AIStudio.tsx:671`), the "slot machine" the study warns against |
| 8 | Export: DXF/DWG, IFC, PDF | **Partial** | PDF (jsPDF) and a basic DXF from SVG paths; `ifc/authoring.ts` exists; DWG none |

**The 5 hard problems (study §5)**

| Problem | Status |
|---|---|
| 1. Nigerian floor-plan dataset (the moat) | **Not started**: no collection or annotation of real drawings, prompts or edits as training data |
| 2. Metric accuracy and buildability | **Partial**: valid geometry on a 0.5 m grid, hard invariants on every plan; no structural grid / wall stacking |
| 3. Edit experience (surgical, not slot-machine) | **Not started**: see pipeline step 7 |
| 4. Code compliance (NBC, setbacks, coverage) | **Partial**: deterministic `compliance_engine.ts` over `compliance_rules.json` (NBC 2006); per-element remediation messages for solver failures |
| 5. 2D → consistent 3D | **Partial**: see pipeline step 6 |

**Recommended path (study §9)**

| Step | Status |
|---|---|
| 1. Lane 1: ship prompt → plan + render, capture real prompts/edits as data | **Partial**: shipped and live; prompts/edits are not yet captured as a dataset |
| 2. Material takeoff on every plan, wired to the supplier network | **Partial**: `AECBillOfQuantities` exists but uses **hardcoded unit prices**, not the verified-supplier marketplace |
| 3. Build the Nigerian dataset in parallel | **Not started** |
| 4. Lane 2: fine-tune + persistent-spec edit loop | **Not started** |
| 5. Architect in the loop; compliance as a checking layer | **Partial**: compliance layer exists; no architect sign-off flow |

**Divergence to keep in view:** the study recommends *wrapping* existing generators (Lane 1) and says the defensible product is **data + compliance + the supplier layer, not the generator**. We chose to build our own deterministic generator (rebuild plan, D1–D8) for metric accuracy and trust, and most effort since July has gone into it. That choice stands, but the generator should be brought to "good enough on villas" and then effort should shift to steps 7 (edit loop) and §9.2 (takeoff → suppliers), and to capturing data.

---

## 1. Where the records live

Read in this order. ★ marks the documents that are authoritative today.

| Document | What it is | State |
|---|---|---|
| ★ `docs/design-references/pdfs/AI-Floor-Plan-Platform-Feasibility.pdf` | **The founding document.** What the product must deliver (2D plans, door/window schedule, renders, metric accuracy), the 8-step pipeline, the 5 hard problems, and the recommended path. **Review it at the start of each session**; progress against it is tracked in §0. | Direction (owner, 2026-10-06) |
| ★ `docs/design-references/pdfs/AI_STUDIO_REBUILD_PLAN.pdf` | Master plan v1.0 for the floor-plan solver: locked decisions D1–D8, session protocol, data contracts, error taxonomy, phases 0–7. It says it **wins over individual judgment**. | Authoritative, but the code has diverged in places (see §4) |
| ★ `docs/design-references/pdfs/2026-10-02-solver-continuation-plan.md` | Latest session handoff: current pass rates, open problems, next steps. | Current |
| `docs/design-references/pdfs/2026-09-22-solver-continuation-plan.md` | Previous handoff. Its §3–§4 analysis and "do not retry" list still hold. | Superseded |
| `docs/design-references/INDEX.md` | Catalogue of reference PDFs and images. The CAD screenshot `2026-06-25 10.18.16` is **the quality bar**. | Current |
| `docs/development/aec_production_guidelines.md` | AEC engineering rules: Hive roles, compliance-first, mandatory output package, surgical/modular commits. | Current (policy) |
| `docs/compliance/professional_design_standards.md` | User-facing claims about NBC 2006 compliance. | Marketing copy. Claims must stay true. |
| `docs/PLATFORM_USER_MODEL.md` | Canonical user categories, tiers, credits, roles and feature-access matrix. | Current (business logic) |
| `docs/roadmaps/ai_studio_roadmap.md` | Original 4-phase AI Studio vision. The rebuild plan supersedes its Phase 2 (placement engine). | Vision only |
| `docs/updates/aec_engine_v2_release_notes.md` | Apr 15 2026 release notes. | Historical. Its Three.js massing has since been reworked. |
| `src/lib/aec/README.md` | Pipeline overview (LLM → solver → validation → IFC → viewers). | **Stale.** `validation/gate.ts` and `repair.ts` were deleted in `7c9dbd6`, and the That Open viewer was removed in `eaf758b`. |
| `IMPLEMENTATION_PLAN.txt` (root) | Feb 23 2026 plan to turn the marketing site into the platform. | Historical, delivered |
| `OpenRouter_Integration_Guide.txt` (root) | Setup and deployment of the `ai-studio` edge function. | Steps still valid; the model names it implies are outdated |
| `Genuine_Stuffs_Product_Description.txt` (root) | Investor/product vision (Studio → BOQ → Marketplace → Pro Portal flywheel). | Vision |
| `extract.txt` (root) | Raw dump of a 2026-07-23 session transcript holding the owner's working directives (§2.3). | The source for §2.3. Not tidy. |
| `docs/research/dashboard_research_report.md` | PM dashboard research. | **Empty file (0 lines).** Content was lost in the Apr 8 migration. |

---

## 2. Development policies

### 2.1 Locked solver decisions (rebuild plan Part A1: do not re-litigate)

| # | Decision |
|---|---|
| D1 | Custom TypeScript backtracking constraint solver. **No** external CP library, WASM, Python service or ML model. **Amended 2026-10-06 (owner):** the search may also be seeded simulated annealing (gap-free layout). Still our own TypeScript, the same plan for the same seed, no ML or external library; D8 still holds. |
| D2 | Axis-aligned rectangles on a grid. L-shaped rooms are out of scope for v1. |
| D3 | 0.5 m grid via the single constant `GRID_RESOLUTION_M` (`solver/units.ts`). Never hardcode 0.5 elsewhere. |
| D4 | The solver must return within its budget, with a best-effort status. |
| D5 | "Adjacent" means a shared wall of ≥ 2 contiguous cells (1.0 m). |
| D6 | **The Hive's JSON output is frozen.** The normalizer adapts to the Hive, never the other way round. (So `49255a7` normalizes free-text types on our side.) |
| D7 | The legacy path is deleted only after a parity gate. (Not followed; see §4.) |
| D8 | **The solver never returns invalid geometry.** It returns a typed failure (UNSAT/TIMEOUT) with diagnostics. No post-hoc "repair". |

Relaxation ladder, strictly in order: `RELAX-AREA-20` → `RELAX-SOFT-ADJ` (never drop hub or corridor edges) → `RELAX-MINWIDTH` → UNSAT. **Amended 2026-10-02 at the owner's request:** if every footprint ends UNSAT/TIMEOUT, a final **`FALLBACK`** step (`relax.ts::runFallback`) runs.
- **Still enforced:** overlap, footprint, suite nesting, and stair alignment (D8 holds).
- **Preferences only:** must-touch pairs, outside walls and reachability rank candidates. Areas may flex ±25%.
- **Gate:** only F-002 still blocks a floor.
- **Result:** a complete plan (`solver_fallback: true`), with each compromise flagged (`ADJACENCY_MISSED`, `EXTERNAL_WALL`, `CORRIDOR_ADJACENCY`, `AREA_ADJUSTED`) and the strict failure kept in `solver_failure`.
- **Harness:** fallback plans are judged on I1/I2/I4/I6/I7 plus **F1_COMPROMISES_FLAGGED**, which fails if any I3/I5 miss is unflagged.
- **Harness runs fixed seeds 1–3** (`HARNESS_SEEDS` overrides). Unseeded runs hid a 9-in-12 failure (`91c17ab`). The error-code taxonomy (N-001…N-008, F-001…F-005, S-001/S-002, R-001) is closed: **no new codes without approval**.

### 2.2 Session protocol (rebuild plan A2/A3)

1. One phase or problem per session.
2. **Read the current file state before writing any diff.** Never edit from memory of an earlier session.
3. Surgical edits only. Any change outside the agreed scope needs the file named, a reason given, and approval **before** writing it.
4. **Run `npm run harness` first and last.** If it fails at the start, fix nothing else until the owner confirms whether the failure is expected.
5. No silent renames, drive-by refactors, formatting sweeps or new dependencies without approval.
6. Coding standards: no `any`, no `@ts-ignore`, JSDoc on exports, `_m`/`_cells` suffixes on every length, unit conversion only in `units.ts`, functions ≤ 60 lines, pure functions and no module-level mutable state.

### 2.3 How the owner wants work done (from the 2026-07-23 directives in `extract.txt`, reaffirmed Sep 22)

- **Verbatim stdout** at every step. Don't paraphrase results.
- **State the expected outcome before running.** A prediction that fails is useful information, not something to hide.
- **Make measurement honest before changing what is measured.** Fix the harness first. The harness must never count vacuous passes: a floor with no geometry reports `TIMEOUT (invariants not evaluated)`, never `7/7`.
- **Smallest change first.** Test a one-line hypothesis before any larger rewrite.
- **One change per diff, measured alone.** Don't stack heuristics before measuring (lesson from the Sep 22 rotation experiment).
- Larger architectural changes go in **their own reviewed diff**.
- Seed sweeps (20 seeds, all invariants) are the standard of evidence, not single runs.

### 2.4 AEC and product rules (`aec_production_guidelines.md`, `src/lib/aec/README.md`)

- **The LLM never produces geometry.** It only emits a `SpatialProgram`; the deterministic solver computes coordinates (decided in `c68510b`, Jun 4).
- Compliance first: request → orchestration → **validation against `src/lib/aec/compliance_rules.json`** → artifact. That JSON is the source of truth for minimum sizes, mix ratios and structural ratios.
- Hive roles mirror the NBC professional boundaries: Architect, Structural Engineer, QS, Builder.
- A "Verified Project" package must contain drawings and specs, a priced BOQ, a QMP, an H&S plan, a construction programme, and a buildability report.
- Commits are surgical and modular: one feature per push, with non-AEC logic preserved.
- **Windows by room type (owner decision, 2026-10-02):**
  - Habitable rooms must touch an outside wall (living, bedroom, kitchen, dining).
  - Stores, wardrobes and dressing rooms never need a window, and bathrooms may be mechanically vented. These are `NO_WINDOW_TYPES`.
  - An **office or study should get a window but may go without**, flagged for review. Stores and wardrobes are more often windowless than offices, so treat the office as a preference, not an exemption. **Not implemented yet.** The first attempt (letting the office go inside at any point, perimeter tried first) was measured and rejected; see §5.

### 2.5 Security and platform rules (from commit history)

- **Roles come from server-side claims only** (`app_metadata`). Forged-role mechanisms were removed (`527540a`), the `MI_DEV_ROLE` localStorage escalation was removed (`78a3ef5`), and email-based admin checks were replaced by claims (`dcf61d9`). Never reintroduce client-writable role sources.
- Pro, Vendor and PM routes go through `ProtectedRoute` (`40ea6b8`).
- Heavy WASM/WebGL packages must be **dynamically imported** and excluded from Vite pre-bundling, or the production build hangs (`2e8c66b`).
- COOP/COEP headers live in `vercel.json`. The CSP has explicit allowances for Paystack and geo APIs. Check both before adding a third-party script.
- The `ai-studio` edge function **must enforce `response_format: json_object`** (`85ca6fc`). Its absence caused the Sep 2026 "generates nothing" outage.
- Deploy edge functions with `supabase functions deploy ai-studio`. Debug with `supabase functions logs ai-studio --follow`.

---

## 3. Progress timeline

| When | Milestone | Key commits |
|---|---|---|
| Feb 23 – Mar 2026 | Marketing site turned into the platform (marketplace, calculators, pro portal). AI Studio goes live on OpenRouter (Mar 2). | `fb75366`, `e5be559` |
| Mar – early Apr | AI Studio UI iterations. Model churn: DALL-E → Gemma → free Llama → paid models (fixing 429s), plus a fallback strategy. | `8ebcaec`…`5830729`, `c338808` |
| Apr 8–15 | Structured AEC output, multi-agent orchestration, PDF export, NBC 2006 rules, priced BOQ, Three.js massing, exponential backoff. (These are the v2 release notes.) | `e77c268`…`7f483db` |
| May 7–26 | Parser hardening against JSON leaking into chat, DXF export, blueprint styling. PDF/DXF gated behind premium. | `e76e4dd`…`31824ec` |
| **Jun 4** | **Deterministic pipeline.** Contracts `DesignBrief/SpatialProgram/SolvedLayout`, LLM emits a program only, first solver, `web-ifc` IFC authoring, multi-storey. | `acea7f8`…`07a9ae9` |
| Jun 19–24 | Client-side solver in production, Hive orchestration on `gemini-2.5-flash`, claims-based security, WASM/COEP stabilization, That Open dependency removed. | `0bb2509`…`eaf758b` |
| Jun 25 | Row and zone packer iterations. **Two reverts:** the multi-strategy engine (`4536a4c`, which produced 34–38 m wide buildings) and the circulation-first rewrite (`65816de`). | `9f45034`…`57674bb` |
| Jun 27–29 | engine_v2: treemap (squarify) "Visual Sprint" A–F, live for all users. | `55846d4`…`36113d1` |
| Jul 13–20 | engine_v2 fixes, `graph.ts` as the authoritative classifier. V1 solver deleted. | `ebe4424`, `56aebe4`, `7c9dbd6` |
| **Jul 21–23** | **solver-v3 per the rebuild plan.** Harness and fixtures, units/types/grid/constraints/candidates/search/relax. Treemap and zones replaced and then deleted. Placement-issues panel in the UI. Phase 3 reopened (feasibility pruning, I5, hub ordering, planarity fail-fast). | `09cbd23`…`4df0338` |
| Aug | Platform work: landing page, BOQ-Cal wired to AI (live Aug 11), vendor CSV import, categories. | `1bafe07`, `ddb8d3c` |
| **Sep 22** | Production outage fixed (`85ca6fc`). Feasibility gate, suite and ordering fixes, footprint portfolio and `solveLayoutVariants()`, multi-bay depth fix. hive-004/005 fixtures added. | `d0784dd`…`8cdfb63` |
| **Oct 1–2** | Harness I1/I5 measured against the building, grid alignment, MRV + forward checking, room-type normalization, solver-placed circulation + I8. | `7b30722`…`b84c902` |

10. **Gap-free layout approved 2026-10-06 (owner, all four decisions):** (1) every plan tiles one rectangle, as in the target drawing; built beside today's engine and swapped in only once it beats it on the 20-seed sweep; (2) D1 amended (above); (3) briefs no layout can meet keep the compromise policy (best clean plan, every miss flagged); (4) `78cdebb` pushed. Decision page: https://claude.ai/artifact/Kc4uzEM8axF43jQASTM8ZC. Next: engine parity (hive-001/002 20/20 clean, villas ≤ 2 flags, ≤ 3 s).
11. **Gap-free prototype measured; three readings accepted (2026-10-07, owner).** Accepted (because they move us toward the target drawing): SPEC_HUB (one hub per floor, the rebuild plan's Phase 2 rule), FOYER_VIA_HALL (a foyer link met through the hall it opens onto; still a soft miss, so a direct wall is preferred), TERRACE_LIGHT (a room opening onto an open-air terrace has daylight). 20-seed sweep of `__harness__/gapfree-proto/run.ts` with these on, vs today's engine (every villa a fallback with 9–15 compromises, ~9 s): hive-001 and hive-002 20/20 solved, and every harness flag is one of the accepted readings. Villas hive-004/005/006/007 solved 5/4/13/7 of 20; the rest average 1.0–1.3 hard misses. **Still short of parity:** 5–14 s per plan (target ≤ 3 s), and 57–63 % of upper walls don't sit on a wall below (pipeline step 5). Harness taught the readings in `340e16c` (I3 foyer via hall, I5 terrace) and the next commit (I3 relaxed plans check the one spec hub, `specHub()` in `graph.ts`): today's engine 162/162 throughout; prototype harness-clean now equals solved (hive-001/002 20/20, villas 5/4/13/7 of 20). **Structure measured (2026-10-07, owner: bays up to 6 m as in the target drawing):** `__harness__/structure.ts` reports I10 on every two-storey plan in `npm run harness`: the shared 3–6 m grid that best fits the plan (fewest columns in rooms, then most upper wall on a beam or a wall below). Target drawing, digitised: 83 %, 0 columns in rooms. Today's engine: 44 %, 2.8 per plan. Reported only, not yet an invariant. Next: shared grid lines in the gap-free prototype, then speed.
9. Structural grid parked 2026-10-06 (§5). It can only be switched on when the conditions in `docs/design-references/pdfs/2026-10-06-structural-grid-design.md` §10 hold. hive-006's brief asks for a 10 m² lounge typed `living`, below the NBC 12 m² living minimum: should the solver flag it, or the Hive type it differently? (owner to decide)

**Current status (Oct 2, 20 seeds, I1–I8):** hive-001 and hive-002 solve 20/20 with no rule violations. hive-004 solves 8/20. hive-005 solves 0/20. hive-003/101/102 are correctly rejected as unsolvable. Details are in the Oct 2 continuation plan.

---

## 4. Where the code diverges from the rebuild plan

Know these before citing the plan as fact.

| Plan says | Reality | Note |
|---|---|---|
| Code in `src/floorplan/*`, Next.js | `src/lib/aec/solver/engine_v2/*`, Vite + React | Paths moved. The plan was written generically. |
| Invariants I1–I7: I3 no overlap/inside, I4 adjacency, I5 window, I6 status-gated, I7 refinement keeps topology | Harness I1 inside footprint, I2 no overlap, I3 adjacency, I4 suite nesting, I5 external wall, I6 status-gated, I7 stairwell mirrored, **I8 reachable** | **Numbering differs.** Always use the harness names (`I5_EXTERNAL_WALL` etc.) to avoid confusion. |
| D4: default budget 8000 ms | `CANDIDATE_FLOOR_BUDGET_MS = 1200` per floor per attempt (≤ 5 footprints × 2 retries) | Changed deliberately in `2fc4cfe`. |
| D7: legacy squarify kept behind a flag until the Phase 6 parity gate | Treemap/squarify deleted on Jul 21–22 with no parity gate | Already done. Don't go looking for the flag. |
| F-003: disconnected-graph check | **Intentionally omitted** (`d0784dd`) | It would false-positive on ordinary rooms. I8 now enforces reachability instead. |
| Phase 4: `refine.ts` (snap, doors, R-001) | Not built. `doors.ts` handles door placement separately. | Open |
| Phase 5: `score.ts` rubric; variants come from seeds 1–5, are deduplicated, and the top 3 are kept | `score.ts` implements the rubric. Variants come from the **footprint portfolio**, not seeds. Up to 4 are kept, sorted best-first, with no dedupe (each comes from a different footprint). Wired into AI Studio via a Web Worker (Oct 2). | Done, with that difference |
| Phase 6: pipeline.ts, user-facing messages per code, week-one monitoring | Messages per code exist (`failure_messages.ts`) and are shown in AI Studio. There's no pipeline.ts and no monitoring. | Partly done |
| A3: strict TS, no `any` | `tsconfig.app.json` has `"strict": false`. engine_v2 contains 17 `any`/`@ts-ignore`. | Technical debt |
| Commit format `phase-N: … [harness: X/Y passing]` | Conventional commits (`feat(solver-v3): …`) since July | The current convention is in use |
| UNSAT means "proven" | `relax.ts:104` labels any early search exhaustion as UNSAT, and `solveLayoutV2` reports the last attempt's status | Found 2026-10-02. This is the first item in the Oct 2 plan. |

---

## 5. Settled lessons: don't repeat these

| Tried | Result | Source |
|---|---|---|
| Multi-strategy layout engine | 34–38 m wide buildings from proportional width overflow. Reverted. | `4536a4c` |
| Circulation-first rewrite (Jun 25) | Reverted to the working solver. (Note: the Oct 2 approach is different. The corridor is an ordinary search unit, not a pre-allocated spine.) | `65816de` |
| Placing the hub at the footprint **centre** | Fragmented free space and blocked perimeter access. Prefer the perimeter. | `extract.txt`, Jul 23 |
| Enumerating every grid position | 15–30k candidates per room, so the search drowned. Use **anchor-based** enumeration (flush to the perimeter or to placed rooms). | `extract.txt`, Jul 23 |
| Rotating HARD-mode multi-bay rooms | Worse: 2/8 → 0/8 | Sep 22 plan §3 |
| Raising the time budget 10× | Barely changed anything. The problem was never the time budget. | Sep 22 plan §3, `ad9b6a8` (20 s/floor) |
| One RNG-picked footprint | 0/20 on hive-001. Use the portfolio with seed retries. | `2fc4cfe` |
| A fixed full-width corridor band | Took 25.5 m² against a declared 7.5 m² and split floors. The solver now places circulation. | `b84c902` |
| `Math.round` grid sizing | The right and bottom walls became unusable, which masked a harness bug | `db2d0d6`, `7b30722` |
| Regenerating candidate lists per node | ~90% of search time. Now incremental. | `b84c902` |
| Matching rooms on `name` instead of `type` | Mislabelled suites | `ce4016a` |
| Trusting the Hive's type spelling | "master bedroom" ≠ `master_bedroom`. Normalize on our side (D6). | `49255a7` |
| Office window as an in-search preference (perimeter first, inside allowed anywhere), Oct 2 | hive-004 8/20 → 6/20, hive-005 0/20 → 0/20, and hive-002's office lost its window in 2/20 runs that had one before. More choices slowed the search, and the preference only holds locally. The office's window is **not** what blocks the villas. Patch not committed. | 20-seed sweep, 2026-10-02 |
| Conflict-directed backjumping (Oct 2) | hive-004 8/20 → 7/20, hive-005 0/20 → 0/20, and the live 23-room villa brief still times out on 10/10 seeds. Diagnostics showed the dead ends are traceable (perimeter rooms losing their last wall spot), but jumping back to the cause doesn't find solutions within budget. The villa ground floors fail around the foyer hub 3–4 rooms deep. Patch not committed. | 20-seed sweep, 2026-10-02 |
| Raising F-004 (degree > 6) for a degree-7 foyer | The live brief still times out on 10/10 seeds. The gate only makes it fail faster. Dropping the two one-sided links to the foyer (office, stair) doesn't help either. | 2026-10-02 |
| Structural grid first, ground floor (Oct 6: whole bays, program-aware bays, midline partitions + NBC minimums) | Villas still fall back 20/20 on whole briefs, with more flagged compromises (18–21 against 12–16). hive-007 ground 1/20. Small houses improve (hive-001/002 20/20 strict). **Parked** behind `layoutMode: 'grid'`; switch-on conditions are in the grid design doc §10. | `2026-10-06-structural-grid-design.md` §7–§10 |
| Wall stacking as a score term on the floor solved second (`STACK_DOWN`, gap-free prototype, 2026-10-07; weight 30, the ground floor pays for upper walls with nothing under them) | Unsupported upper walls only 57–63 % → 49–59 %, and it costs solves (villas 5/4/13/7 → 4/2/12/6 of 20) and time (~14 → ~18 s). Two floors searched separately rarely line up by penalty alone; stacking has to come from shared structure (common cuts or grid lines), not a score. Reverted. | 20-seed sweep, ledger §3 item 11 |
| A fixed even grid both floors snap to (`GRID_SNAP`, gap-free prototype, 2026-10-07: fewest even bays ≤ 6 m, any cut within 1 m of a line moves onto it) | Villas collapse: solved 5/4/13/7 → 0/0/0/1 of 20, misses per plan ~1 → 2.1–2.7; structure barely moves (on-structure 41–50 % → 48–53 %, columns in rooms unchanged). A grid picked before the rooms fights the room sizes; any grid has to come from the program or the plan. Reverted. | 20-seed sweep with I10 report |
| Free OpenRouter models | 429s. Paid models plus a fallback. | `5830729` |
| Statically importing WASM/3D packages | Production builds hung | `2e8c66b` |

---

## 5b. Gap to the target drawing (assessed 2026-10-02)

Assessed against the quality bar (`images/Screenshot 2026-06-25 at 10.18.16 AM.png`, CAD ground + first floor) using the owner's live screenshots (`images/Screenshot 2026-10-02 at 5.44.*`).

**Layout (solver)**

| Gap | Status |
|---|---|
| Building sized to the plot, not the rooms, leaving large voids | **Fixed** `8fe41f2`: fill 46–54% → 75–81% |
| Unusable proportions (2 m bedroom, 1.5 × 7.5 m dining) | **Fixed** `b45cbde`: minimum width and maximum aspect per type |
| Foyer mid-plan, no front door | **Fixed** `c4e648f`: entrance on the front (bottom) edge, I9 |
| Shared bathroom placed twice, suites broken | **Fixed** `7269dc7` |
| Garage not on the street front | **Fixed** `95a9388`: 0–4/20 → 20/20 on every fixture with a garage |
| Hall is a strip, not the connected space between rooms | Open |
| No structural grid; upper walls don't stack on lower ones | Open (largest change) |
| Fallback plans: up to ~12 missed adjacencies on villas | Open |

**Drawing (renderer)**

| Gap | Status |
|---|---|
| No furniture | **Fixed** `f6c6e18` (keyed on type) |
| Labels truncated ("3-Car Enclose…") | **Fixed** `a1c969c`: wrap to two lines, then shrink; title block says PLOT (`3abba4d`) |
| Thin walls instead of thick external/internal walls | Open |
| No door/window tags (D1…, W1…) or schedule | Open |
| Overall dimensions only, no per-bay chains or grid bubbles | Open |
| Stair is a box, with no treads or UP arrow | Open |
| One floor at a time instead of a sheet with both floors | Open |

## 6. Open items (single list)

1. ~~Honest UNSAT/TIMEOUT labelling~~ done in `5b59633`: hive-005 turned out to be a TIMEOUT, not proven UNSAT, so it is a search problem.
2. Large villas (hive-004 8/20, hive-005 0/20, live brief 0/10): backjumping was tried and didn't help (§5). The remaining lever is a local-search fallback that returns a complete plan with flagged issues (item 3). **Since `b84c902`, a failed ground floor gives a blank plan** (the upper floor is no longer drawn on its own), and the UI shows no message.
3. ~~Fallback plan instead of a blank~~ done on Oct 2. Failed floors also get a plain-language explanation (`failure_messages.ts`, one message per F-/S- code). The next quality step is fewer compromises per fallback plan: up to ~10 missed adjacencies on the villas.
4. ~~Wire `solveLayoutVariants()` into `AIStudio.tsx`~~ done on Oct 2: scored options in a Web Worker, shown as an "Option N · score" picker.
5. Office window: decided 2026-10-02 (§2.4), still to implement. It would only be a last resort after normal search fails, and it does **not** unblock hive-004/005 (§5).
6. Rebuild-plan phases not yet built: refinement (Phase 4), scoring (Phase 5), the pipeline plus user messages per code (Phase 6). Then update the plan to v1.1 with the divergences in §4.
7. Documentation debt: `src/lib/aec/README.md` is stale, `dashboard_research_report.md` is empty, and the plan's invariant numbering doesn't match the harness.
8. Typing debt: `strict: false` and 17 `any`/`@ts-ignore` in engine_v2.
