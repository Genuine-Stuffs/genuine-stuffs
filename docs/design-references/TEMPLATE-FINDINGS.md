# Template findings: building floor-plan templates

Source folder: `docs/design-references/templates/Building Floorplan Design/` (16 template folders, received 2026-10-20).
Purpose: extract every concrete, reusable detail that could improve AI Studio's floor-plan engine for Nigerian residential typologies, each tied to an engine change.

**Reading key used throughout**
- **[read]**: read directly off a drawing (label, dimension, schedule entry).
- **[grid]**: a room size taken from the grid bays it fills (the room's own dimension isn't written; its walls sit on the grid lines).
- **[inferred]**: my interpretation (e.g. a room's purpose from its furniture, a span from the drawing's proportions). Treat with care.
- **[thumb]**: seen only as a contact-sheet thumbnail (renders and interiors), not at full size.

Template IDs (T1–T16) are used everywhere below; the folder for each is in §1.

---

## 1. Inventory

**What's in the folder:** 262 `.webp` images and 2 `.DS_Store` files (macOS folder metadata, no content). There are **no PDF, DWG, DXF or ZIP files**, even though several folder names say "PDF, CAD Files" or "DWG CAD File": each folder holds only the listing's product photos (renders, interiors, and photographed or exported plan sheets). Nothing needs converting. If you have the actual CAD/PDF files from these listings, the sheets I could only read at listing resolution (T10, T14) would read better from them.

**Readability:** every `.webp` opened (largest side 1,536–1,600 px). Plan sheets were read at full size; renders and interiors were reviewed as numbered contact sheets (thumbnails) and opened at full size only where they carried drawing information.

| ID | Folder (verbatim) | Images | Drawing sheets (image #) | Readable? |
|---|---|---|---|---|
| T1 | `23x33 Feet House Design Plans 7x10 Meter 4 Beds 3 Baths Flat Roof (A4 Hard Copy)` | 12 | #1 CAD plans, ground + first | yes, all 12 opened full size |
| T2 | `28x33 feet House Plan 8.5x10 meter 4 Beds 2 Baths PDF, CAD Files &A4 Hard Copy` | 20 | #1 CAD plans | yes (plan full size; 19 renders/interiors [thumb]) |
| T3 | `28x34 Feet House Design Plan 8.4x10.2 Meter 4 Bed 3 Bath PDF, CAD &A4 Hard Copy` | 21 | #1 CAD plans + door/window schedule; #6 coloured furnished plans | yes |
| T4 | `30x33 Ft House Design Plans 9x10 Meter 4 Beds 4 Bath A4 Printed, PDF & CAD Plan` | 22 | #1 CAD plans; #7, #15 coloured layouts | yes |
| T5 | `33X56 House Design Plans 10x17 Meter 6 Bed 8 Bath Flat Roof PDF & A4 Hard Copy` | 24 | #1 CAD plans | yes |
| T6 | `36x40 Feet House Design Plan 11x12 Meter 4 Beds 5 Baths Hip Roof (A4 Hard Copy)` | 13 | #1 CAD plans; #2 index of the full 18-page drawing set (thumbnail-scale pages) | yes (#2's pages legible only for titles and layout) |
| T7 | `36x40 Feet Modern House Plan 11x12 Meter 4 Beds 4 Baths Hip Roof (A4 Hard Copy)` | 15 | #1 CAD plans; #2 drawing-set index (same set as T6) | yes |
| T8 | `39x49 Feet Modern House Plan 12x15 Meter 5 Beds 6 Baths Flat Roof (A4 Hard Copy)` | 25 | #1 CAD plans; #2–3 3D cutaway plans from above (with site) | yes |
| T9 | `39x56 Feet House Plans 3d 12x17 Meter 6 Beds 8 Baths PDF File and (A4 Hard Copy)` | 24 | #1 CAD plans + schedule | yes |
| T10 | `49x56 Feet House Design 15x17 Meter 5 Beds 8 Bath A4 Printed, PDF, & CAD Files` | 24 | #23 CAD plans | **partly**: the sheet is low resolution; most room labels and all dimension text are blurred (only bay dimensions readable) |
| T11 | `Barndominium House Plan Design 2100 SF 4 Bed 3 Bath Garage - Drawings Blueprints` | 3 | #0 render + coloured plan (feet) | yes |
| T12 | `CAD FILE BLUEPRINTS MEDITERRANEAN HOUSE PLAN ARCHUP #104M` | 10 | #9 hand-coloured plan (feet, SF) | yes |
| T13 | `Modern House Plan AutoCAD File And PDF For Blueprint Plans - 2 Bedrooms` | 12 | #3 3D + finish legend; #4 ground plan (A03); #5 upper plan; #6 elevation; #7 section; #8 footing layout (A01); #9 roof plan; #10 roof framing; #11 electrical | yes (#4, #8 full size; others [thumb]) |
| T14 | `Modern House Plan Box Type 3D images DWG CAD File And PDF For Blueprint Plans` | 10 | #3 ground plan; #4 first plan; #5 second/roof plan; #6–7 elevations; #8–9 sections | yes (#3, #4, #8 full size; #5–7, #9 [thumb]) |
| T15 | `Modern House Plan Building Plans Blueprints 217m 2,336ft 3 bedroom 2.5bath CAD` | 16 | #6 ground plan + room key; #7 upper plan + room key; #14–15 photos of a CAD screen | yes (#14–15 too small to read) |
| T16 | `Modern House Plan Building Plans Blueprints 330m 3,550ft` | 11 | #1 ground plan + key; #2 upper plan + key; #4–7 elevations; #8 SITE PLAN; #9–10 sections | yes (#1, #2, #8 full size; others [thumb]) |

**Provenance caveat (affects everything below):** none of the 16 templates is Nigerian. T1–T10 are from one Southeast-Asian design studio (same drafting style, "Page 2" sheets, metric with feet in brackets); T11–T12 are US (feet, square feet); T13 and T14 are South-Asian-style drafting (T14's TV lobby, verandahs and "open to sky" are the closest to Nigerian practice); T15–T16 are Eastern European (room keys with m², boiler rooms). So there is **no BQ, generator house, overhead water tank, borehole, septic tank or soakaway in any template**. Those Nigerian site items can't be learned from this set (see §7).

---
## 2. Per-template extraction

Setbacks: **no template dimensions its setbacks.** Only T8 (aerial render, #2), T14 (front parking strip) and T16 (site plan, #8) show the house on its plot at all, and none of them carries setback figures. Every "setbacks implied" line below says what can be seen; none of it can confirm or refute our 6 / 3 / 3 Lagos residential figures. (Separately, the engine *was* applying commercial 9 / 6 / 3 to villa prompts because of the word "Home Office"; that was a prompt-reading bug, fixed in `ec2d97f`, not something these templates show.)

"Widest clear span" = the largest room's shorter side, i.e. the distance a floor or roof must span between walls/columns, unless a column is drawn inside the room.

### T1 — 7.2 x 10.2 m, 2 storeys, 4 bed 3 bath, flat roof [read]
- **Plot / setbacks:** not shown. Exterior render shows a boundary wall close to the house sides [thumb, inferred: side setback ≈ 1–1.5 m].
- **Grid:** A–B–C = 3.0 / 4.2 m; 1–4 = 3.6 / 3.6 / 3.0 m. [read]
- **Labels (verbatim):** Ground: `Bed 1`, `Closet`, `Kitchen`, `WC`, `Dining`, `Living rm`. First: `Bed 2`, `Bed 3`, `Bed 4`, `Closet`. Tags D1–D4, W1–W6. Unlabelled: car porch (car drawn), stair, baths on the first floor, balcony.
- **Sizes:** Bed 1 ≈ 3.0 x 3.6 [grid]; open living/dining/kitchen 4.2 x 10.2 [grid] (one space); car porch 3.0 x 3.0 + 1.2 m front strip [grid]; first-floor bedrooms 3.0 x 3.6 and 4.2 x 3.6 [grid].
- **Widest clear span:** 4.2 m (the open living bay). [grid]
- **Adjacencies:** kitchen–dining–living open in one bay; kitchen side door (D2) to the side yard; WC between Bed 1 and the stair, off the open space; first-floor baths between the rear bedrooms and the landing; balcony over the car porch, off the landing.
- **Stairs / parking:** dog-leg stair in the 3 m bay, middle row, rising from the open living space (no ground-floor hall at all); car porch inside the footprint, front-left, open, under the upper floor. No BQ / gen house / tank.
- **Schedule:** tags only on this sheet; sizes not printed.
- **Conventions:** grid letters across (A, B, C) and numbers front-to-back (1–4); dimension chains left + bottom (bays + overall), metres with feet in brackets; section marker cutting the stair; furniture in every room; "Page 2".

### T2 — 8.5 x 10 m, 2 storeys, 4 bed 2 bath, mono-pitch roofs [read]
- **Plot / setbacks:** not shown.
- **Grid:** A–B–C = 3.9 / 4.6 m; 1–4 = 3.8 / 2.0 / 4.2 m; the side bath bumps out 0.75 m. [read]
- **Labels:** Ground: `Bed 1`, `Bed 2`, `Closet`, `Study room`(first floor), W1–W4, D1–D4. Unlabelled: open living/dining/kitchen, shared bath, stair, veranda.
- **Sizes:** bedrooms 3.9 x 3.8 and 3.9 x 4.2 [grid]; shared bath 3.9 x 2.0 (+0.75 bump) [grid]; study ≈ 4.6 x 3.0 [grid, inferred].
- **Widest clear span:** 4.6 m (open living bay). [grid]
- **Adjacencies:** two bedrooms either side of ONE shared bath in a 2.0 m strip, bath door to the open space; kitchen galley along the rear of the open space with a rear door; front veranda wrapping the front-right corner; first-floor balcony over the veranda; rooms stack directly over rooms (bath over bath).
- **Stairs / parking:** U-stair in the middle of the open-space bay; no parking shown.
- **Conventions:** dimension chains top, left and bottom.

### T3 — 8.4 x 10.2 m overall (house body 7.0 x 9.0), 2 storeys, 4 bed 3 bath, flat roof, rear pool [read]
- **Plot / setbacks:** not shown.
- **Grid:** A'–A–B–C = 1.4 / 2.8 / 4.2 m; 1–4 = 3.0 / 2.2 / 3.8 m + 1.2 m front strip. [read]
- **Labels:** Ground: `Bath`, `wd` (washing machine), `Bed 4`, `Closet`, `Kitchen`, `Living rm 3.2x3.3`, `Entrance`. First: `Bed 2`, `Bed 3`, `Closet`, `Bath`, `Master Bed`, `Balcony`.
- **Sizes:** living 3.2 x 3.3 = 10.6 m² [read, written in the room]; carport 4.2 x 5.0 [read]; master ≈ 4.2 x 3.8 [grid]; front terrace over the carport 6.2 x 5.25 with a 1.2 m strip [read, #6]; rear balcony 1.2–1.3 m deep [read].
- **Widest clear span:** 4.2 m. [grid]
- **Adjacencies:** ground guest bedroom (Bed 4) next to the bath (bath has the washing machine); kitchen + dining open at the rear with a rear sliding door; stair in its own 2.2 m row with the landing projecting outside the wall; master + en-suite + door onto the terrace over the carport; shared bath off the landing beside the en-suite.
- **Stairs / parking:** U-stair, landing bumped out with a full-height window W2 2.0 x 5.9; CARPORT projecting at the front-left, roof = master's terrace.
- **SCHEDULE (printed):** D1 1x2.5, D2 0.9x2.2, D3 0.7x2.2, D4 2.6x2.5; W1 1.8x6.1, W2 2x5.9, W3 1.5x2.3, W4 0.8x0.8 (w x h, metres). [read]

### T4 — 9 x 10 m (+1.5 m front strip), 2 storeys, 4–5 bed 4 bath, flat roof, solar panels [read]
- **Plot / setbacks:** not shown.
- **Grid:** A–B–C(–D) = 4.5 / 4.5 (+1.0) m; 1–6 = 4.1 / 2.2 / 1.2 / 2.5 / 1.5 m. [read]
- **Labels:** Ground: `Living rm`, `Dining`, `Kitchen`, `Bath`, `Office`, `Parking`, `LP` by the stair in the colour layout [read; inferred a typo for `UP`, which the CAD sheet has in the same place]. First: `Balcony`, `Bed 4`, `Bed 5`, `Bath`, `Gym room`, `Master Bedroom`.
- **Sizes:** office ≈ 2.5 x 3.7 [grid, inferred]; parking ≈ 4.5 x 6.0 [grid, inferred]; bedrooms 4.5 x 4.1 [grid].
- **Widest clear span:** 4.5 m. [grid]
- **Adjacencies:** LIVING + DINING + KITCHEN across the REAR as one space with two sliding doors (D4) onto a full-width rear terrace; front door → straight hall to the living room; office at the front with a street window; guest bedroom middle-right; each first-floor bedroom has its own bath placed between it and the corridor, and a balcony; master over the parking with a front balcony.
- **Stairs / parking:** U-stair in the 2.2 m row, landing bumped out 0.9 m; carport front-right under the master.
- **Conventions:** colour layouts (timber = bedrooms, tile = wet rooms and kitchen, grey = circulation).

### T5 — 10 x 17 m, 2 storeys, 6 bed 8 bath, flat roof (long narrow plot) [read]
- **Plot / setbacks:** not shown.
- **Grid:** A–B–C = 5.0 / 5.0 m; 1–5 = 4.8 / 3.7 / 4.0 / 4.5 m. [read]
- **Labels:** Ground: `Laundry area`, `Bath`, `Storage`, `Bed 6`, `Closet`, `Kitchen`, `Dining`, `Living rm`, `Parking`, `Bed 5`. First: `Balcony`, `Bed 4`, `Bed 3`, `Bath`, `GYM room`, `Master Bed`, `Closet`, `Bed 2`.
- **Sizes:** bedrooms ≈ 5.0 x 4.8 / 5.0 x 4.5 [grid]; laundry area ≈ 1.5 x 4.8 [inferred]; parking 5.0 x 4.5 [grid].
- **Widest clear span:** 5.0 m. [grid]
- **Adjacencies:** rear SERVICE ZONE (laundry with its own outside door, storage, common bath) behind the kitchen; kitchen + dining across the full width; living + stair in the next row; parking + Bed 5 at the front; every bedroom en-suite; first-floor Bed 3 / Bed 4 mirrored with baths back to back; side balconies; master with closets and a front balcony over the parking.
- **Stairs / parking:** straight flight + landing along the right wall; parking inside the footprint, front-left.

### T6 — 11 x 12 m (+1.2 m porch), 2 storeys, 4 bed 5 bath, hip roof [read]
- **Plot / setbacks:** not shown.
- **Grid:** A–B–C–D = 4.0 / 2.5 / 4.5 m (+0.6 and 0.8 m projections); rows 4.5 / 2.5 / 5.0 / 1.2 m. [read]
- **Labels:** Ground: `Bed 4`, `WC`, `wd`, `Kitchen`, `Small cabinet`, `Closet`, `Dining`, `Living room`, `Parking`. First: `Balcony`, `Bed 2`, `Bed 3`, `WC`, `Down`, `Study area`, `Master Bedroom`, `Family room`. Door tags include `MD1` (wide sliding door, red) [read; "MD" meaning inferred: main/sliding door].
- **Sizes:** parking 6.5 x 5.0 [grid]; WCs in the 2.5 m column ≈ 2.5 x 2.0 [inferred].
- **Widest clear span:** **6.5 m** — the parking spans A–C (4.0 + 2.5) with no column drawn at line B inside it [read: no column symbol; inferred: a beam or the upper floor's wall carries the B line].
- **Adjacencies:** the 2.5 m middle column holds the WCs and the stair; Bed 2 / Bed 3 mirrored with WCs back to back; study area open off the landing; family room on the first floor with its own balcony; internal door from the parking into the stair hall.
- **Full drawing set (#2, 18 pages):** column/footing plan, ground/first floor plans, wall plans, beam plans, roof plan, 4 elevations, 4 sections, 2 lighting layouts. Member sizes legible: footings 1.6 x 1.6, columns 0.2 x 0.2, ground beams 0.2 x 0.45, floor beams 0.2 x 0.35 m [read at low resolution]. Note on the structural sheets: "Please discuss with your contractor for clearly size Footing, Beam, Column."

### T7 — 11 x 12 m, 2 storeys, 4 bed 4 bath, hip roof (same drawing set as T6) [read]
- **Grid:** rear 4.0 / 3.0 / 4.0 m, front 4.0 / 1.5 / 5.5 m (two different column chains); rows 4.0 / 2.5 / 4.5 + 1.0 + 1.0 m. [read]
- **Labels:** Ground: `Dining`, `Bar conter` [sic], `Kitchen`, `wd`, `Living RM`, `Parking`. First: `Balcony`, `Bedroom 3`, `Bedroom 4`, `Bedroom 2`, `Balcony`, `Master Bed`.
- **Sizes (written inside rooms on the first floor):** Bedroom 2 3.9 x 3.5; master 5.3 x 5.3; en-suite 1.4 x 2.8; bath 1.6 deep; Jack-and-Jill bath 3.0 x 2.5; wall offset 1.45 m. [read]
- **Widest clear span:** **5.5 m** (parking and open living, front bay 5.5 m); master 5.3 x 5.3. [read]
- **Adjacencies:** open living + dining with a bar counter to an ENCLOSED kitchen (own door, rear exit); utility/WC with the washing machine beside the kitchen; Jack-and-Jill bath between the two rear bedrooms (door from each); porch with columns across the living room's front.

### T8 — 12 x 15 m (12.7 with projections), 2 storeys, 5 bed 6 bath, flat roof [read]
- **Plot / setbacks:** aerial #2 shows the site: road on one side, front lawn and paved path, boundary wall all round, sliding gate at the driveway [inferred: front setback ≈ 3–5 m, sides ≈ 1.5–2 m, from proportions only].
- **Grid:** rows A–F = 4.2 / 4.1 (3.3 + 0.8) / 2.2 / 4.5 m; columns 3.7 / 2.3 / 1.9 / 4.1 / 0.7 m. Here rows are LETTERS and columns NUMBERS (opposite of T1–T5). [read]
- **Labels:** Ground: `Balcony` (actually a covered rear terrace), `Bath`, `Closet`, `Bed 5`, `Kitchen`, `Dining`, `Pantry Washing room`, `Living rm`, `Parking`. First: `Balcony`, `Bed 3`, `Bed 4`, `Bath`, `Closet`, `Bed 2`, `Cym` [sic, gym], `Master bedroom`.
- **Widest clear span:** 4.5 m on the plan; the double-height living room is 6.0 x 4.5 [grid].
- **Adjacencies:** kitchen (island) + dining open onto a covered rear terrace through two sliding doors; guest Bed 5 en-suite at the rear; service cluster pantry/washing room + common bath + glazed office; DOUBLE-HEIGHT living front-left with its void drawn as a large X on the first floor; entrance double door between living and parking; master with a walk-in closet room, en-suite and balcony over the parking.

### T9 — 12 x 17 m, 2 storeys, 6 bed 8 bath, flat roof, side pool [read]
- **Grid:** A–B–C = 6.0 / 6.0 m; rows 4.3 / 3.2 / 4.5 / 5.0 m. [read]
- **Labels:** Ground: `Kitchen`, `Bath`, `Bed 2`, `Office room`, `Dining`, `Living rm`, `Parking`, `UP`. First: `Bed 4`, `Bed 5`, `Bath`, `Closet`, `Gym room`, `Bed 3`, `Mcster Bedroom` [sic], `Balcony`, `DOWN`.
- **SCHEDULE (printed):** D1 0.9x2.5, D2 0.9x2.1, D3 0.8x2.1, D3 [sic, second D3] 2.3x2.5; W1 1.2x6.3, W2 0.8x2.1, W3 3x2.1, W4 2x2.1, W5 0.8x0.8, W6 2.8x1.7. [read]
- **Widest clear span:** **6.0 m** — every room spans a full 6 m bay (parking 6 x 5, bedrooms 6 x 4.3). [grid]
- **Adjacencies:** a CENTRAL HALL spine down the length between two 6 m bands (double-loaded); living (double height, front door straight into it) → dining → common bath → kitchen (rear sliding door); parking, guest bedroom, office, Bed 2 down the other band; straight stair along the parking wall; first floor: mirrored rear bedrooms with back-to-back baths, gym, master en-suite, balcony over the parking, void over the living room.

### T10 — ≈ 18 x 18.5 m, 2 storeys, 5 bed 8 bath, flat roof [partly readable]
- **Grid:** columns 1.0 / 3.5 / 4.0 / 3.0 / 4.5 / 2.0 m; rows 4.5 / 6.5 / 6.0 / 1.5 m. [read]
- **Labels (legible):** `Store Washing Room` [read, blurred], `Kitchen`, `Bath`, `Dining`, `Bed 5`, `Closet`, `Parking`, `Living rm`, `Balcony`, `Bed 3`, `Bed 4`, `Bed 2`, `Gym`, `Bed 1` [read, blurred]; others illegible.
- **Widest clear span:** **8.5 m** — double carport 8.5 x 6.0 m, no column drawn inside it [read: columns only at its corners and front; inferred: a long-span beam or transfer under the terrace above].
- **Adjacencies [inferred from #23 and the interiors]:** a planted internal COURTYARD / light-well in the middle that living and dining open onto through folding glass doors; laundry (two machines) with an external door; side balconies on the first floor.

### T11 — Barndominium, single storey, 63'8" x 33' (≈ 19.4 x 10.1 m) + 2-car garage 20'8" wide, 4 bed 3 bath [read]
- **Labels:** `BEDROOM +/- 10' x 10'` (x2), `BEDROOM +/- 11' x 12'`, `MASTER BEDROOM +/- 12' x 12'`, `CLOSET`, `BATH`, `MASTER BATH`, `LINEN`, `MASTER CLOSET`, `GARAGE`, `DINING`, `KITCHEN`, `LIVING ROOM +/- 19' x 19'`, `LAUNDRY`, `PANTRY`, `OFFICE +/- 8' x 15'`, `FRONT PORCH`, `REAR GRILLING PORCH`.
- **Sizes:** bedrooms 3.0 x 3.0 to 3.7 x 3.7; living 5.8 x 5.8; office 2.4 x 4.6; garage 6.3 x 8.8; front porch 2.4 m deep; rear porch 8.8 x 3.9. [read, feet converted]
- **Widest clear span:** **6.3 m** garage (20'8"); living 5.8 m. [read]
- **Adjacencies:** SPLIT-BEDROOM plan (master suite on the far side from the other bedrooms); great room at the centre (front door into the living room); kitchen island + dining open to it, rear porch off the kitchen; laundry + pantry + bath + office between the kitchen and the master wing; the garage enters through a short hall between the two secondary bedrooms.

### T12 — Mediterranean villa, single storey, 78' x 82' (≈ 23.8 x 25 m), 3,481 SF heated (≈ 323 m²) [read]
- **Labels:** `BEDROOM` (x3), `W.I.C.`, `BRKFST`, `OPT. WINE ROOM`, `NICHE`, `SHELVES`, `LANAI 457 SF`, `LIVING ROOM`, `HEATED AREA 3481 SF`, `KITCHEN`, `PANTRY`, `LAUNDRY`, `DINING AREA`, `FOYER`, `STUDY`, `MASTER BEDROOM`, `MASTER BATHROOM`, `LINEN`, `DECORATIVE NICHE`, `FRONT PORCH 117 SF`, `TWO CAR GARAGE 593 SF`, `GARAGE`; appliances `DW`, `REF`, `D`, `W`, `WS`, `WH`, `AHU`. Each room also carries `10'0" CLG TILE` (ceiling height + floor finish).
- **Sizes:** lanai ≈ 42.5 m²; garage ≈ 55 m²; front porch ≈ 10.9 m². [read, SF converted]
- **Widest clear span:** not dimensioned; the living room is the widest room [inferred > 6 m from proportions].
- **Adjacencies:** foyer → formal dining (one side) + study (other side) → central living open to kitchen and breakfast nook → lanai at the rear; split bedrooms (master wing right, three bedrooms left); garage → laundry (with water heater and softener) → kitchen.

### T13 — small cottage, 2 storeys, 2 bed, 23'6" x 23'6" (≈ 7.2 x 7.2 m) [read]
- **Labels:** `KITCHEN`, `DINING AREA`, `BATH 01`, `LIVING AREA`, `ENTRANCE PORCH`, `OUTDOOR PORCH`; tags D1–D3, W1–W4, `FW1` (French window); `DW` (dishwasher).
- **Sizes:** entrance porch 6'7" (2.0 m) deep; side porch 5'1" (1.55 m). [read]
- **Footing layout (A01):** column bays 11'11" x 10'10" (3.6 x 3.3 m), rows 11'1" / 11'8" / 6'7"; 3' x 3' (0.9 m) RC footings; 9" x 9" (0.23 m) RC columns and ground beams; bar callouts (4T16, R6 @ 7" c/c). [read]
- **Widest clear span:** 3.6 m (structural bays); the open living/kitchen is ≈ 7 m but has a column line through it on the footing plan. [read]
- **Conventions:** title block on every sheet (revision table, project name, sheet title, scale 1:50, sheet number A01–A0x).

### T14 — narrow row house, 24'7" x 63'10" (≈ 7.5 x 19.5 m) + front parking, 3 levels + roof terrace [read]
- **Plot / setbacks:** the plot is ≈ 24'7" x 73'5" (7.5 x 22.4 m) including the parking [read: two overall dimensions 63'10" and 73'5"]; the house fills the plot's width (no side setbacks — a terrace/row house) [inferred].
- **Labels:** Ground: `VERANDAH` (front and rear), `KITCHEN 10 x 11`, `BED ROOM 13 x 12`, `TOILET 9 X 5`, `DINING AREA 12 X 13`, `open to sky`, `TV LOBBY 14 X 11`, `UP`, `LIVING AREA 10 X 19`, `OFFICE ROOM 10 X 10`, `PARKING 10 X 16`. First: `BALCONY`, `BED ROOM 10 X 14`, `BED ROOM 13 X 12`, `TOILET 9 X 5`, `LOBBY 11 X 13`, `PASSAGE`, `VOID`, `LOBBY 10 X 19`, `LOBBY 6 X 7`, `BED ROOM 10 X 15`, `DN`. Tags `D1`, `D2`, `DW`, `DW1`, `DW2` (double doors), `MD` (main door), `W1`, `W2`, `FL` [meaning not given; inferred: fanlight/vent].
- **Sizes:** all room sizes in feet inside the rooms [read]: bedrooms 10x14 to 13x12 (3.0 x 4.3 to 4.0 x 3.7 m); toilet 9x5 (2.7 x 1.5 m); kitchen 10x11; living 10x19 (3.0 x 5.8 m); office 10x10; parking 10x16 (3.0 x 4.9 m); balconies 3–4 ft deep.
- **Widest clear span:** 14 ft (4.3 m), the TV lobby. [read]
- **Adjacencies:** office with its OWN double door from the front verandah (separate client entrance); living from the verandah (main door); central TV lobby beside an OPEN-TO-SKY courtyard; dining → kitchen → rear verandah and back door; bedroom with an attached toilet (door from the bedroom); first floor: void over the TV lobby, passage beside the open-to-sky shaft, bedrooms with front and rear balconies.
- **Conventions:** COLUMNS drawn in the plan as solid squares at wall corners and junctions; sections X–X and Y–Y marked; the section (#8) shows the open-to-sky shaft full height with a tree at the bottom.

### T15 — 196.62 m² house (108.17 ground + 88.45 upper), 2 storeys, 3 bed 2.5 bath, gable roof, integral garage [read]
- **Labels (ground key):** `1. ENTRY - 3.63`, `2. WARDROBE - 6.48`, `3. HALL - 5.87`, `4. STOREROOM - 3.65`, `5. KITCHEN - 22.78`, `6. LIVING ROOM - 25.14`, `7. TOILET - 2.15`, `8. BOILER ROOM - 7.15`, `9. LAUNDRY - 2,58`, `10. GARAGE - 28,29`, `11. TERRACE`. (Upper key) `1. CORRIDOR - 8.54`, `2. CHILDHOOD BEDROOM 01 - 11.07`, `3. CHILDHOOD BEDROOM 02 - 11.22`, `4. BEDROOM - 15.25`, `5. WARDROBE - 3.96`, `6. BATHROOM 01 - 9.04`, `7. BATHROOM 02 - 4.40`, `8. WARDROBE - 11.46`, `9. LAUNDRY - 2.58`, `10. CABINET - 13.55`, `11. LOGGIA`; `FLOOR SQUARE`, `TOTAL HOUSE SQUARE`.
- **Stair:** `20 x 165 = 3300` written on the stair (20 risers of 165 mm = 3.3 m floor to floor). [read]
- **Widest clear span:** ≈ 5.5 m (living/kitchen width) [inferred from proportions].
- **Adjacencies:** entry vestibule + coat room → hall with stair; open kitchen (island) + living across the rear onto a covered terrace; guest toilet off the hall; garage → laundry → hall (mud-room route); boiler room with its own outside door; master bedroom with walk-in wardrobe and en-suite; study ("cabinet") opening onto a loggia.

### T16 — 306.14 m² house (175.02 ground + 131.12 upper), 2 storeys, with a SITE PLAN (0.38 ha) [read]
- **Labels (ground key):** `1. ENTRY WITH WARDROBE - 11.23`, `2. STOREROOM - 7.90`, `3. KITCHEN AND LIVING ROOM - 32.37`, `4. DINING ROOM - 25.36`, `5. HALL - 15.44`, `6. CORRIDOR - 6.62`, `7. GUEST BEDROOM - 13.29`, `8. BATHROOM - 8.33`, `9. BOILER ROOM - 8.12`, `10. LAUNDRY - 4.82`, `11. GARAGE - 41.54`, `12. TERRACE`. (Upper) `1. HALL - 28.80`, `2./3. CHILDHOOD BEDROOM 01/02 - 16.02/16.07`, `4. BATHROOM 01 - 6.27`, `5. WARDROBE 01 - 5.70`, `6. WARDROBE 02 - 12.9`, `7. BEDROOM - 21.39`, `8. BATHROOM 02 - 12.52`, `9. TECHNICAL ROOM - 11.45`, `10. TERRACE`.
- **Site plan labels:** `1. TWO STORY HOUSE`, `2. MAIN ENTRANCE`, `3. TERRACE`, `4. SECURITY`, `5. PLACE FOR CAR`, `6. HOUSE FOR DOGS`, `7. PLACE FOR FIRE`, `8. CELLAR`, `9. GARDEN HOUSE`, `10. LAKE`, `11. SAUNA`, `12. YARD`, `13. NEIGHBORS HOUSE`, `14. STREET`, `SQUARE - 0.38 hectares`.
- **Widest clear span:** double garage ≈ 41.5 m² → ≈ 6 x 7 m [inferred]; kitchen-living ≈ 5.5 m wide [inferred].
- **Adjacencies:** entry with coat storage → central hall (stair) → kitchen-living-dining along the garden side onto a terrace around a courtyard tree; a corridor to a guest wing (guest bedroom + bathroom); garage → laundry; the upper hall is a 28.8 m² family space.
- **Site plan conventions:** boundary as a red dashed line with red dots at the corners (survey beacons); SECURITY post by the street at the gate; car forecourt at the entrance; outbuildings linked by paths; neighbours' houses drawn outside the boundary; north arrow; site area.

---
## 3. Cross-template findings, each tied to an engine change

### 3.1 Master list of room labels, and how our engine classifies them today

All 83 distinct room labels read in §2, passed to the engine's `classifyRoom` **by name only** (`scratch.local/labels.mts`, 2026-10-20). This is the worst case: the AI usually also sends a `type`, which is checked first. **31 of 83 fall back to "private" with a console warning.**

| Label(s) seen (verbatim) | Templates | Engine today | Engine change |
|---|---|---|---|
| `Bed 1`…`Bed 6`, `Bed Room` | T1–T6, T8–T10, T14 | **private, by fallback** (only "bedroom" spelled out is recognised) | Alias `bed N` / `bed room` → bedroom in the name fallback. |
| `Bedroom 2`, `Master Bed`, `Master Bedroom`, `Mcster Bedroom` [sic], `Guest Bedroom`, `Childhood Bedroom 01` | T3–T9, T11, T12, T15, T16 | private (bedroom) | none (but "master" must also trigger a master suite: see 3.4) |
| `Living rm`, `Living RM`, `Living room`, `Living Area`, `Family room` | most | social | none |
| `TV Lobby`, `Lobby`, `Hall`, `Corridor` | T14, T15, T16 | circulation | Note: T14's TV LOBBY is the family room *and* circulation (14 x 11 ft, furnished) — a circulation room that must also be sized as a room. |
| `Passage` | T14 | **private, by fallback** | Alias → circulation. |
| `Entrance`, `Entry`, `Entry with Wardrobe`, `Foyer` | T3, T12, T15, T16 | `Entrance` **falls back**; the others social | Alias `entrance` → foyer. |
| `WC`, `Toilet`, `Bath`, `Bathroom 01`, `Master Bath`, `Master Bathroom` | all | private | none (wet-room flag comes from the type) |
| `Closet`, `Small cabinet`, `W.I.C.`, `Linen`, `Cabinet` (T15 = study!) | T1–T12, T15 | **private, by fallback** (`Master Closet`, `Wardrobe` OK) | Alias `closet`, `w.i.c.`, `walk-in closet`, `linen` → wardrobe (a suite sub-room). **Contradiction:** T15's `CABINET` is a study (desk, 13.55 m²), T6's `Small cabinet` is furniture → don't alias "cabinet". |
| `Study room`, `Study area`, `Study`, `Office`, `Office room` | T2, T4, T6, T9, T11, T12, T14 | private | none; but `Study area` (T6) is an *open* area off the landing, not a room. |
| `Gym room`, `GYM room`, `Gym`, `Cym` [sic] | T4, T5, T8, T9, T10 | **private, by fallback** | Add type `gym` (habitable, needs a window). Appears in 5 of 10 duplexes. |
| `Laundry`, `Laundry area`, `Pantry`, `Pantry Washing room`, `Store Washing Room`, `Storeroom`, `Boiler room` | T5, T8, T10, T11, T12, T15, T16 | service | none |
| `Storage`, `Technical room` | T5, T16 | **fallback** | Alias `storage` → store; `technical room` / `plant room` → service (in Nigeria: inverter/battery room — see 3.5). |
| `Opt. Wine room`, `Brkfst`, `Bar conter` [sic] | T7, T12 | **fallback** (Bar conter → private) | `breakfast` / `brkfst` → dining. `Bar counter` is a kitchen fitting, not a room: don't create a room for it. |
| `Parking` | T1, T3–T10, T14 | **private, by fallback** | **Alias `parking` / `car park` → garage family (carport)**. Seen in 10 of 16 templates — the commonest unrecognised label. |
| `Garage`, `Two Car Garage` | T11, T12, T15, T16 | service | none |
| `Balcony`, `Terrace`, `Loggia`, `Verandah` | most | social | none |
| `Lanai`, `Front Porch`, `Rear Grilling Porch`, `Entrance Porch`, `Outdoor Porch` | T11, T12, T13 | **fallback** | Alias `porch`, `lanai` → veranda (open-air). |
| `open to sky`, `Void` | T14, T8/T9 (void drawn) | `Void` circ; `open to sky` **fallback** | Add type `courtyard` / `light-well` (open-air, no roof, in the middle of the plan). |
| `Security` | T16 | **fallback** | Our gatehouse detection matches "security post/house/room" but not "Security" alone → extend `GATE_NAME`. |
| `Garden House`, `Sauna`, `Cellar`, `House for dogs`, `Place for fire`, `Place for car` | T16 (site) | fallback | Out of scope for Nigerian residential, except "place for car" → parking (above). |

### 3.2 Room sizes by type (min / typical / max)

Metric; feet converted. Sources and reading kind in brackets. "Typical" is the middle of the values seen, not an average.

| Room type | Min | Typical | Max | Values (template, kind) | Engine change |
|---|---|---|---|---|---|
| Secondary bedroom | 9.3 m² (3.0 x 3.0) | 12–16 m² | 21.5 m² | 3.0x3.0 (T11 read), 3.0x4.3, 3.0x4.6 (T14 read), 3.0x3.6 (T1 grid), 3.9x3.5 (T7 read), 3.9x3.8, 3.9x4.2 (T2 grid), 11.07, 11.22 (T15 read), 13.29 guest (T16 read), 16.02, 16.07 (T16 read), 4.5x4.1 (T4 grid), 5.0x4.5–4.8 (T5 grid) | Our bedroom targets come from the AI; use 9 m² / 2.7 m wide as the floor (both already in the planner) and ≈ 12–16 m² as the expected band for checks. |
| Master bedroom | 13.6 m² (3.7 x 3.7) | 15–21 m² | 28 m² | 3.7x3.7 (T11 read), 15.25 (T15 read), 4.2x3.8 (T3 grid), 21.39 (T16 read), 5.3x5.3 (T7 read), 6.0x4.3 (T9 grid) | Master = bedroom + en-suite + wardrobe (3.4). |
| En-suite / bathroom | 3.9 m² (1.4 x 2.8) | 4–6 m² | 12.5 m² (master) | 1.4x2.8 (T7 read), 2.7x1.5 (T14 read), 3.0x2.5 (T7 read, Jack-and-Jill), 3.9x2.0 (T2 grid), 4.40, 9.04 (T15 read), 6.27, 8.33, 12.52 (T16 read) | None: our bathroom minimum is 1.5 m wide (`minWidthFor`, checked), as T14 (1.5 m); T7's en-suite is 1.4 m, slightly narrower. |
| WC / guest toilet | 2.15 m² | 2–3 m² | — | 2.15 (T15 read); T1 WC with separate basin room [grid ≈ 1.5 x 1.5] | — |
| Kitchen | 10.2 m² (3.0 x 3.4) | 15–23 m² | 32 m² (open with living) | 10x11 ft (T14 read), 22.78 (T15 read), 32.37 kitchen+living (T16 read); galleys ≈ 2.0–2.5 m wide inside open spaces (T2, T3 [inferred]) | — |
| Living room | 10.6 m² (3.2 x 3.3) | 18–25 m² | 33.6 m² | 3.2x3.3 (T3 read — smallest), 10x19 ft (T14 read), 25.14 (T15 read), 19x19 ft (T11 read) | — |
| Dining | 14.5 m² | 14–25 m² | 25.4 m² | 12x13 ft (T14 read), 25.36 (T16 read); usually inside the open living space, not a room | Dining is most often an *area* of the living/kitchen space, not a walled room (T1–T4, T8, T9, T11). |
| Office / study | 9.3 m² | 10–13.5 m² | 19 m² | 10x10 ft (T14 read), 8x15 ft = 11.1 (T11 read), 13.55 (T15 read), ≈ 6x3.2 (T9 grid) | — |
| Parking, 1 car (carport/garage) | 14.9 m² (3.0 x 4.9) | 21–30 m² | 32.5 m² | 10x16 ft (T14 read), 4.2x5.0 (T3 read), 4.5x6 (T4 grid), 6x5 (T9 grid), 28.29 (T15 read), 6.5x5 (T6 grid) | Our enclosed-garage rule (2.5 m per car + 0.3 m each side = 3.1 m for one) is below T3/T4's 4.2–4.5 m but above T14's 3.0 m (an open bay). |
| Parking, 2 cars | 41.5 m² | 50–55 m² | 56 m² | 41.54 (T16 read), 8.5x6 = 51 (T10 grid), 593 SF = 55 (T12 read), 20'8"x29' = 55.7 (T11 read) | Two-car widths seen: 6.3 m (T11), 8.5 m (T10). Our rule gives 5.6 m: on the low side; T11's 6.3 m is the tightest real one. |
| Laundry | 2.58 m² | 2.5–5 m² | 4.82 m² | 2.58 (T15 read), 4.82 (T16 read), ≈ 1.5x4.8 strip (T5 [inferred]) | — |
| Store / pantry | 3.65 m² | 4–8 m² | 7.9 m² | 3.65, 7.90 (T15/T16 read) | — |
| Walk-in wardrobe | 3.96 m² | 5–12 m² | 12.9 m² | 3.96, 11.46 (T15 read), 5.70, 12.9 (T16 read) | — |
| Hall / landing as family space | 5.87 m² | — | 28.8 m² | hall 5.87 (T15), 15.44 ground / 28.80 upper (T16), TV lobby 14x11 ft = 14.3 (T14) | The upper hall is often a furnished family/study space (T6, T14, T16): our "hall cap" (`424e00c`) keeps halls small; a brief with a family lounge can use the hall as it. |
| Balcony depth | 0.9 m | 1.2–1.5 m | 3.0 m+ (terraces) | 3–4 ft (T14 read), 1.2, 1.3 (T3 read), 1.5 (T7 read) | Our balcony leaves: check their depth ≥ 1.2 m. |
| Porch / veranda depth | 1.2 m | 1.2–2.4 m | 3.9 m | 1.2 (T3, T6 read), 2.0 (T7 grid; T13 read 6'7"), 2.4 (T11 read 8') , 3.9 (T11 rear 12'8") | — |
| Stair band | 2.2 m | 2.2–2.5 m | 3.0 m | 2.2 (T3, T4, T8 read), 2.5 (T6, T7 read), 3.0 (T1 grid) | Our stair module is 2.5 x 4.0 m: matches. T15 gives the rise: 20 x 165 mm = 3.3 m floor to floor. |

### 3.3 Widest clear spans and the 6 m structural-bay rule

| Template | Widest clear span | Room | Kind | How it's carried |
|---|---|---|---|---|
| T1 | 4.2 m | open living bay | grid | grid bay |
| T2 | 4.6 m | open living bay | grid | grid bay |
| T3 | 4.2 m | living / master bay | grid | grid bay |
| T4 | 4.5 m | rooms in the 4.5 m bays | grid | grid bay |
| T5 | 5.0 m | 5 m bays | grid | grid bay |
| T6 | **6.5 m** | parking (A–C, no column at B inside it) | read (no column drawn) + inferred (beam) | a beam along the B line above the parking [inferred] |
| T7 | 5.5 m | parking / open living (front 5.5 m bay) | read | grid bay |
| T8 | 4.5 m (double-height living 6.0 x 4.5) | living | grid | grid bay; the void needs no floor |
| T9 | **6.0 m** | every room in the two 6 m bands | grid | grid bay at our maximum |
| T10 | **8.5 m** | double carport (8.5 x 6.0, columns only at its corners) | read + inferred | a long beam under the terrace above [inferred] |
| T11 | **6.3 m** | 2-car garage (20'8") | read | not shown (US timber/steel frame) |
| T12 | > 6 m | living room (not dimensioned) | inferred | not shown |
| T13 | 3.6 m structural bays; living ≈ 7 m but with a column line through it | — | read (footing plan) | columns on the 3.6 x 3.3 m grid, even inside the open living room |
| T14 | 4.3 m | TV lobby (14 ft) | read | columns drawn at every wall junction |
| T15 | ≈ 5.5 m | kitchen-living | inferred | not shown |
| T16 | ≈ 6–7 m | double garage (41.5 m²) | inferred | not shown |

**Findings.**
1. Habitable rooms stay within 6 m everywhere (T9 is exactly 6.0 m); most bays are 3.0–5.0 m. **Our 6 m maximum bay holds for rooms; no change needed for living rooms.** (Contrary to your example: no template runs a *living area* past 6 m on a dimensioned plan; T12's may, but it isn't dimensioned.)
2. **Every span over 6 m is a car space**: T6 6.5 m, T10 8.5 m, T11 6.3 m, T16 ≈ 6–7 m [inferred]. In each, no column stands inside the car space. **Engine change:** treat garages/carports as *column-free* rooms (no grid column inside; a transfer beam where a grid line crosses it, flagged for the engineer), the same mechanism as the long-span halls (`structural.ts`, capability D) but at car-space widths. Today a 2-car carport wider than 6 m would get a column in the middle of the parking.
3. **Narrow service columns**: T6 (2.5 m) and T2 (2.0 m) put wet rooms and the stair in a narrow bay between the room bays. Our grid's minimum room bay is 3.0 m, with 2.5 m allowed only for corridors. **Engine change (candidate):** allow a 2.0–2.5 m bay where every floor has wet rooms or the stair in it, not only corridors.
4. Member sizes seen: columns 225 mm (T13, 9") and 200 mm (T6); beams 200 x 350–450 (T6), 225 x 225 ground beams (T13); pad footings 0.9–1.6 m square. Our rule file's beam width is 225 mm: consistent.

### 3.4 Adjacency patterns (what sits next to what)

Counted over the templates that have both rooms. "Open" means the same space with no wall.

| Pattern | Seen in | Count | Engine change |
|---|---|---|---|
| Kitchen opens to (or shares a wall with) the dining area | T1–T9, T11–T16 (T10 inferred) | 15/15 | Already a typical brief link; keep it hard. |
| Living + dining (+ kitchen) as ONE open space | T1, T2, T3, T4, T8, T9, T11, T12, T15, T16 | 10/15 | Allow living/dining/kitchen as one space ("great room"); today each is a separate rectangle. |
| Kitchen ENCLOSED, linked by a bar counter or door | T7 (T13 open) | 1/15 | Contradiction with the line above: keep both. In Nigeria a closed kitchen is common (smell, "dirty kitchen"); the brief should decide. |
| Kitchen has an outside door (back door, side door or sliding to a rear terrace) | T1, T2, T3, T4, T5, T6, T7, T8, T9, T11, T14, T15, T16 | 13/16 | Our yard door does this on the ground floor already. |
| Master bedroom has an en-suite | every template with a master: T3–T9, T11, T12, T15, T16 | 11/11 | Hard rule (our suites do this). |
| Master has a walk-in wardrobe / closet room | T8, T11, T12, T15, T16 (+ closets T5, T7) | 5/11 | Optional sub-room. |
| Master has its own balcony | T3, T4, T5, T6, T8, T9 | 6/9 duplexes | Prefer a master balcony on the upper floor. |
| Two bedrooms with MIRRORED baths back to back between them | T5, T6, T8, T9 | 4/10 duplexes | Prefer back-to-back wet rooms (one plumbing wall). |
| One bath shared by two bedrooms between them (Jack-and-Jill or off the hall) | T2, T7, T11 | 3 | — |
| En-suite placed BETWEEN the bedroom and the corridor (the bath is the buffer) | T1 (rear beds), T4, T5, T9 | 4 | Prefer placing a bedroom's bath on its corridor side. |
| A ground-floor guest bedroom (usually en-suite) in a 2-storey house | T1, T3, T4, T5, T6, T8, T9, T10, T16 | 9/12 | Expected in Nigerian duplexes too; already in our briefs. |
| Wet rooms stack over wet rooms between floors | T2, T5, T6, T8, T9 (T4, T14 partly) | most | **Measured on our plans: only 22% of upper wet rooms sit at least half over a ground wet room or kitchen (18/81, `scratch.local/tplgap.mts`).** Add a stacking preference for wet rooms. |
| Every bath/WC on an outside wall with a small window (0.8 x 0.8 m) | all except T12's inner WCs and T15's toilet | ≈ all | **Measured: 79% of our baths have an outside wall (85/108).** Strengthen the bath-ventilation preference. |
| Garage → laundry → kitchen/hall (service route) | T12, T15, T16 (T11 garage → hall) | 4/4 enclosed-garage houses | When a brief has a laundry and an enclosed garage, link them. |
| Car space under the upper floor at the front | T1, T3 (projecting, roof = terrace), T4, T5, T6, T7, T8, T9, T10 | 9/10 SE-Asian duplexes | Matches our duplex car porch; keep car spaces on the street front (done). |
| Office/study at the front, near the entrance (T14: its own door) | T4, T12, T14 (T9 middle) | 4 | Prefer an office on the street front; optional own entrance. |
| Upper landing widens into a family/study space | T6 (study area + family room), T14 (lobby 11x13), T16 (hall 28.8 m²) | 3 | Our family lounge does this when the brief asks. |
| Double-height living with a void over it (drawn as an X) | T8, T9, T14 (void over the TV lobby) | 3 | Done (atrium, `ef140d0`): same drawing convention. |
| Courtyard / light-well in the middle of a deep plan | T10, T14 (open to sky), T16 (courtyard tree in the terrace) | 3 | New: courtyard type (3.1); useful for deep Nigerian plots (light and cross-ventilation). |
| Living room on the garden (rear) side, onto a terrace | T4, T12, T15, T16 (T8 kitchen/dining onto the rear terrace) | 4–5 | **Contradiction:** T1, T2, T3, T6, T7, T9, T14 put the living room at the street front. Measured on our plans: 13/24 ground living rooms touch the rear wall — no preference either way today. Leave it to the brief ("garden-facing living") rather than a rule. |
| Split-bedroom plan (master on the far side from the other bedrooms) | T11, T12 (single storey) | 2/2 bungalows | For bungalows: prefer the master suite in a different wing from the secondary bedrooms. |

### 3.5 Stairs, BQ, generator house, water tank and parking

| Item | What the templates do | Kind | Engine change |
|---|---|---|---|
| **Stair** | U / dog-leg stairs in a dedicated 2.2–2.5 m band across the house, often with the landing PROJECTING outside the wall with a full-height window (T3 W2 2.0 x 5.9, T4 0.9 m bump, T6, T7). Straight flights along a wall in long plans (T5, T9, T13, T15 with winders). Drawn with treads, an arrow and `UP` / `DN` / `Down`; T15 writes the risers on the stair (`20 x 165 = 3300`). In small houses the stair rises straight out of the living space (T1, T2, T9, T13) with no hall. | read | Our stair module (2.5 x 4.0 m, treads, UP/DN) matches. Candidate: write the riser count/height on the stair, as T15 does (3.3 m storey ÷ 165–175 mm risers). |
| **BQ (boys' quarters)** | **Not in any template.** | — | Nothing to learn here; our BQ outbuilding rules come from your briefs. |
| **Generator house** | **Not in any template.** The nearest are T15/T16's BOILER ROOM / TECHNICAL ROOM *inside* the house with their own outside door, and T12's water heater / softener in the garage. | read | None for generators (they stay outside, your rule). In Nigerian terms the "technical room" is the inverter/battery room: could be a brief room type (service, outside door, ventilation). |
| **Water tank / borehole / septic tank / soakaway** | **Not in any template.** | — | Can't be learned from this set. They need your Nigerian references. |
| **Parking** | 9 of 10 SE-Asian duplexes put a 1–2-car space INSIDE the footprint at the front, under the upper floor (carport or open "Parking"), its roof the master's balcony or terrace; T3's projects from the house body. US/EU houses have enclosed integral garages (T11, T12, T15, T16) entered from the house through a laundry or hall. T14: open parking bay at the front of a row house. T16 site: a paved "place for car" forecourt at the gate. | read | Our car porch / garage on the street front matches. Add `Parking` as a recognised label (3.1). Prefer an internal door from an enclosed garage into the house (T6, T11, T12, T15, T16). |
| **Security post / gatehouse** | T16 only: `SECURITY` by the street at the gate (site plan). | read | Matches our gatehouse placement (front setback, at the gate). Extend the name match to plain "Security". |

### 3.6 Door and window schedule conventions

- **Tags are by TYPE, not by instance:** every door of the same size carries the same tag on every floor (`D2` on all room doors, `D3` on all bath doors). [read: T1–T9, T13, T14] *Ours does the same.*
- **Numbering order is by ROLE, not by size.** D1 = the main entrance (T1 D1, T3 D1 1.0 x 2.5, T9 D1 0.9 x 2.5), D2 = room doors, D3 = bath doors, D4+ = sliding/terrace doors (T3 D4 2.6 x 2.5 is the widest yet numbered last). Windows likewise: W1 = the big feature window (T3 W1 1.8 x 6.1, T9 W1 1.2 x 6.3), the small bath window last (W4/W5 0.8 x 0.8), but W2–W4 aren't in size order (T9: W2 0.8 x 2.1, W3 3 x 2.1, W4 2 x 2.1). [read] **Contradiction with our engine:** `openingSchedule` numbers widest first, so a duplex's 7.5 m garage door becomes D1 and the front door D2. **Engine change:** number doors by role (entrance → room → bath → sliding/terrace → garage/vehicle) and windows by size within the "feature / room / bath" groups.
- **Special prefixes:** `MD1` for the wide sliding/main doors (T6, red in the drawing), `MD` main door, `DW` / `DW1` / `DW2` double doors (T14), `FW1` French window (T13), `FL` (T14, meaning not given). [read] Optional for us; plain D/W is enough.
- **Schedule format:** a two-column table beside or under the plans, tag in a circle + `w x h meters` (T3, T6, T9), e.g. `D1 1x2.5 meters`. Sizes are width x height. [read] *Ours prints `0.9 × 2.1 m` with a count: equivalent; the count is extra.*
- **Sizes seen:** entrance 0.9–1.0 x 2.5 (T3, T9; double doors in T8, T10, T11, T12); room doors 0.9 x 2.1–2.2; bath doors 0.7–0.8 x 2.1–2.2; sliding doors 2.3–2.6 x 2.5; bath windows 0.8 x 0.8; bedroom windows 1.5 x 2.3 (floor-to-ceiling) or 2.0 x 2.1; stair / double-height windows 1.2–2.0 x 5.9–6.3 (full height). [read] **Engine check (done):** ours are room 0.9 x 2.1, bath 0.8 x 2.1, entrance 0.9 x 2.5 (`openings.ts`) — all inside the templates' ranges. No change.

### 3.7 Labelling, dimensioning and titling conventions

| Convention | Seen in | Kind | Engine status / change |
|---|---|---|---|
| Grid bubbles: LETTERS across the width, NUMBERS front-to-back | T1–T5, T9 | read | Ours: same. |
| ...the opposite: numbers across, letters front-to-back | T8, T10 | read | **Contradiction**; keep ours (the majority). |
| Dimension chains: per-bay chain + overall chain on two or three sides (left, bottom, and often top), metres with feet in brackets | T1–T10 | read | Ours: bays + overall on two sides, metres only. Candidate: feet in brackets (Nigerian clients often think in feet). |
| Room NAME only, no sizes inside rooms | T1, T2, T4, T5, T6, T8, T9 | read | — |
| Room SIZES written inside the room | T3 (`Living rm 3.2x3.3`), T7 (dimension lines inside rooms), T14 (`13 x 12` ft in every room) | read | Ours: `6.0M × 7.0M` under the name: matches T3/T14. |
| NUMBERED ROOM KEY beside the plan: number in the room, list of name + area (m²), floor total + house total | T15, T16 | read | Candidate: a room schedule with areas and floor totals (useful for BOQ and approvals). |
| Ceiling height + floor finish in each room (`10'0" CLG TILE`) | T12 | read | Candidate for the BOQ link (finishes per room). |
| Furniture in every room | all | read | Ours: yes. |
| Colour layout (finish colours: timber bedrooms, tile wet rooms, grey circulation) | T3, T4 | read | Ours: per-type fills: similar. |
| COLUMNS drawn in the plan as solid squares at wall junctions | T14 (and T6's column plan) | read | Ours: only with "show columns & beams" on. Candidate: draw the grid columns by default, as T14 (Nigerian drawings usually do). |
| Section markers (cut lines with arrows, numbered or lettered) | T1, T6, T7, T8, T14, T15, T16 | read | Ours: none (we have no sections). |
| North arrow | T16 site plan; [thumb] in others | read | Ours: yes. |
| Sheet title + "Page N" | T1–T10 | read | Ours: title line under the plans. |
| Title block (revisions table, project name, sheet title, scale, sheet number A01…) | T13 | read | Candidate for the PDF export. |
| The double-height void drawn as a large X | T8, T9, T14 | read | Ours: same (atrium). |

### 3.8 The full drawing set a template sells

T6/T7 (#2) list 18 sheets: column/footing plan, ground and first floor plans (furnished, with schedules), WALL plans (walls only, fully dimensioned), beam plans for each floor and the roof, roof plan, front/back/left/right ELEVATIONS with level marks (±0.00, +3.20, +6.40, ridge), four SECTIONS, and two LIGHTING/POWER layouts (sockets, lights, switches, AC, distribution board, legend). T13 adds a 3D view with a finish legend, roof framing and an electrical sheet; T14 elevations and sections. [read at title level; contents [thumb]]

**Against our output:** we produce floor plans (+ schedule), a site plan, a structural overlay (grid, columns, beams), a BOQ and a 3D massing view. **Missing:** elevations, sections, roof plan, footing/column plan as its own sheet, wall plan, electrical layout. **Engine change (candidate, largest value for "replicate the template"):** elevations and a section generated from the plan (storey heights, openings from `openings.ts`, roof from the footprint) — they would also give the exterior render a drawn reference to match.

### 3.9 The site plan (T16 #8) against ours (`AECSitePlan`)

| T16 shows | Ours | Change |
|---|---|---|
| Boundary as a red dashed line with RED DOTS at each corner (survey beacons) | solid fence line | Add beacon dots at plot corners (Nigerian survey plans mark beacons; candidate: beacon numbers). |
| Numbered legend (house, main entrance, terrace, security, parking, outbuildings…) | labels on the buildings | Candidate: a numbered legend for many outbuildings. |
| Neighbours' houses and the street drawn outside the boundary | road band only | Optional context. |
| Paths linking every outbuilding to the house | driveway only | Candidate: paths to the BQ / gen house. |
| North arrow, site area (0.38 ha) | north arrow, plot area, coverage % | Ours has more (coverage). |

---
## 4. Contradictions between templates (not averaged away)

| Topic | One way | The other way | What the engine should do |
|---|---|---|---|
| Where the living room faces | Street front: T1, T2, T3, T6, T7, T9, T14 | Garden/rear, onto a terrace: T4, T12, T15, T16 (T8 kitchen/dining to the rear) | Follow the brief; no default rule. |
| Kitchen open or closed | Open to dining/living: T1–T6, T8, T9, T11–T16 | Enclosed with its own door + bar counter: T7 | Follow the brief; in Nigeria many clients want a closed (or "dry + wet") kitchen. |
| Ground-floor circulation | No hall at all: the living space is the circulation (T1, T2, T3, T13) | A hall/spine (T4, T9, T10, T14, T15, T16) | Our engine always makes a hall; small houses could drop it (candidate, larger change). |
| Grid labelling | Letters across, numbers deep (T1–T5, T9) | Numbers across, letters deep (T8, T10) | Keep ours (the majority). |
| Room sizes on the drawing | Written in rooms (T3, T7, T14) | Numbered key with areas (T15, T16); none (T1, T2, T4–T6, T8, T9) | Keep sizes in rooms; add a key as an option. |
| Columns in the plan | Drawn at every junction (T14, T6 column sheet) | Not drawn on the plans (T1–T13, T15, T16) | Candidate: draw them (Nigerian practice is closer to T14). |
| Window numbering | Largest first (T3) | Not in size order (T9) | Number by group (feature / room / bath). |
| `Cabinet` | A study, 13.55 m² (T15) | A piece of furniture (`Small cabinet`, T6) | Don't alias "cabinet". |
| Car space | Open carport under the upper floor (T1, T3–T10, T14) | Enclosed integral garage (T11, T12, T15, T16) | Both supported (car porch / garage); the brief decides. |
| Upper landing | A small landing (T1–T5, T7–T9) | A furnished family space (T6, T14, T16) | Follow the brief (family lounge). |

## 5. Our engine against the templates (measured, 2026-10-20)

On the 27 sample plans of the earlier door work (villa fixtures with the owner's prompt, hive-001/002, duplex, bungalow; 24 with a plan), `scratch.local/tplgap.mts`:

| Rule the templates follow | Templates | Our plans today |
|---|---|---|
| Every bath/WC on an outside wall (window) | ≈ all | 79% (85/108) |
| Upper-floor wet rooms over ground wet rooms or the kitchen | most (T2, T5, T6, T8, T9) | 22% (18/81) |
| Room labels the engine recognises (by name only) | 83 labels | 52/83; 31 fall back to "private" |
| Living room on the garden side | 4–5 of 15 | 13/24 (no preference) |

**#3 result (2026-10-20, duplex benchmark, 40 seeds, `scratch.local/benchwhy.mts`, default / rear opt-in):** the solver alone already puts 85% / 89% of baths and WCs on an outside wall, so no outside-wall term was added. Upper bathrooms at least half over a ground wet room or kitchen: 16% / 19% before. `WET_STACK` is now a soft cost (never a miss) on houses planned downwards: the ground floor's wet rooms are drawn under the bathrooms above.

| Weight | Duplex solved | Duplex stacked | Villas, no void (50) | Villas with void (50) |
|---|---|---|---|---|
| off | 28 / 31 | 16% / 19% | 46 | 34 |
| **20 (shipped)** | **35 / 32** | **24% / 21%** | **43** | 34 (not applied) |
| 40 | 35 / 30 | 31% / 27% | 42 | 34 (not applied) |
| 80 | 25 / 28 | 34% / 34% | – | – |

Applied to plans built upwards (villas with a void) it cost 34 → 24–26 of 50, so it is off there. Still well short of "most" in the templates: the ground floor rarely has enough wet rooms to sit under four or five en-suites, and a stronger pull loses solved plans. A narrow service bay (§3.3 item 3) is the likelier route to more.

**#4 result (2026-10-21, the 27 sample plans, `scratch.local/carcols.mts`):** 7 of 24 car spaces (all 7–10 m 3-car garages) had a grid column inside the parking. Now none: `carSpaces` in `structural.ts` keeps a garage, carport or parking clear like a long-span hall, with a **transfer beam** (orange on the plan, its span and minimum depth by the span rule) on each grid line that crosses it. The 7 upper-floor columns standing over those garages stay, each on its transfer beam, and are flagged for a structural engineer (plan note and a red box on the drawing). A secondary beam whose grid beam was removed runs on along its line to the next member. The pre-screen reads the car space's full span (7–10 m: a warning naming the beam depth). Room placement is unchanged (harness 186/186, 237/237).

**#5 elevations (2026-10-21):** `elevations.ts` works out each face from the placed rooms and `openings.ts` (the same doors and windows as the plan and schedule); `AECElevations` draws front, rear and both sides at one scale under the floor plan. Storey 3.2 m floor to floor and level marks ±0.00 / +3.20 / +6.40 / roof / parapet (T6/T7); flat roof behind a 0.9 m parapet (most templates are flat-roofed: T1, T3–T5, T8–T10; T6/T7 hip, T2 mono-pitch, T15 gable); window heads at 2.1 m; terraces and balconies with a 1.0 m rail; walls set back from the face a shade darker. Check on the 24 sample plans (`scratch.local/elevchk.mts`): 473/473 planned windows and 72/72 outside doors on an elevation, none twice, none overlapping. Note: the 3D view uses room heights of 3.0–4.2 m, not this 3.2 m storey; to align in the 3D phase.

**#5 section A–A (2026-10-21):** `section.ts` cuts along the ground-floor stair's flight (front to back through the middle when there is no stair), from the plan's own walls (`walls.ts`) and openings; `AECSection` draws cut walls and slabs solid, the doors and windows the cut passes through (tagged), the slab on grade, floor slabs (none over the stair or an open-to-below void), roofs and parapets, terrace rails, room names, level marks and the stair's flight. The floor plans mark the cut A–A with arrows for the view direction. On the 24 sample plans 21 sections cut a stair. **Found:** the plan's stair is one straight 4.0 m flight, which climbs the 3.2 m storey in 14 risers of 229 mm (going 286 mm); a house stair is normally kept to about 180–190 mm risers. The section prints the figure in red; the stair module needs a longer run or a half landing (dog-leg) — an engine change for the owner to decide.

**Stair fixed (owner 2026-10-21: dog-leg):** `stair.ts` lays a dog-leg in the stairwell the planner already reserves (2.5 × 4.0 m): two 1.15 m flights with a 0.2 m well, 18 risers of 178 mm (3.2 m storey), 300 mm going, a 1.6 m half landing at the far end; the first flight starts at the hall end and the second arrives back there. The floor plans (UP below, DN above, the walking line) and section A–A (cut through the first flight, the second dashed beyond, the landing slab) draw that one stair. No room placement change. A stairwell under 2.0 m wide falls back to a straight flight, flagged "too steep" when its risers pass 190 mm (common practice; the NBC figure is still to confirm). On the 24 sample plans: every section's stair is now 178 mm risers.

**#6 drawing conventions (2026-10-21), four commits:** dimension chains read metres with feet and inches in brackets (4.5m (14'-9"); metres alone where a bay is too narrow), and the plan header's floor levels now read the 3.2 m storey; the grid's columns are drawn on every plan as solid squares (red with the beams in the structure view); a numbered room key (0.1, 1.1…; `roomKey.ts`) with each room's area, each floor's enclosed area, terraces and balconies apart, and the house total, the number above each room's name; red survey beacons B1–B4 at the plot corners on the site plan.

**#7 tried as a grid rule (2026-10-21), not kept:** letting the structural grid take a 2.0 or 2.5 m bay wherever every floor has a bath, WC, store, wardrobe, laundry, stair or hall exactly that wide on the same strip changed nothing on the 24 sample plans: columns in rooms 16 → 16, upper wall on structure 66.8 % → 66.8 %. On 21 plans the only such strip is the 2.5 m hall/stair strip the grid already takes as a corridor bay; the other 3 are one-storey plans (100 % on structure already), one of which picked a different grid scoring the same. T2's and T6's service bays exist because the rooms are planned around them; our planner never lines wet rooms up in a strip on every floor, so the grid has nothing to take. The gain needs the planner to make the strip (a service-zone preference in the gap-free search, like the flats' core zone `ZONES`), a larger change and a rule change for the owner.

## 6. Engine changes, ranked by how technically suitable they are to do next

"Suitable" = strong evidence across templates, fits the engine as it is, low risk, measurable.

| # | Change | Evidence | Size / risk | Measure |
|---|---|---|---|---|
| 1 | **Residential label aliases** (§3.1): `Bed N`, `Bed Room`, `Passage`, `Entrance`, `Closet`, `W.I.C.`, `Linen`, `Gym`, `Storage`, `Technical room`, `Brkfst`, `Parking`, porches/`Lanai`, `open to sky`, `Security` | 10+ templates; 31/83 labels fall back today | small, low risk (name fallback only; the AI's type still wins) | labels recognised 52 → ~80 of 83; every fixture's zones unchanged |
| 2 | **Door numbering by role** (D1 = entrance; garage/vehicle doors last) | T1, T3, T9 schedules | small, drawing only | schedule order on the sample plans |
| 3 | **Wet-room stacking + baths on outside walls** as stronger preferences: **done 2026-10-20 (stacking only, owner chose weight 20)** | most templates; ours 22% / 79% | medium: a new cost term in the gap-free search; **a rule change, needs your OK** | stacking % and outside-wall % on the 50 villa plans, solved count unchanged |
| 4 | **Column-free car spaces** (no grid column inside a garage/carport; transfer beam flagged): **done 2026-10-21** | T6, T10, T11, T16 (every span over 6 m) | medium, structural layer only | columns inside car spaces → 0 on the sample plans |
| 5 | **Elevations + a section** generated from the plan: **done 2026-10-21** | T6/T7 (18-page set), T13, T14, T16 | large, new drawing type | owner review; render matching |
| 6 | Drawing conventions: feet in brackets on dimensions, columns drawn by default, numbered room key with areas, beacon dots on the site plan: **done 2026-10-21** | T1–T10, T14, T15–T16 | small each | browser check |
| 7 | Narrow 2.0–2.5 m service bay for wet rooms/stair: **tried 2026-10-21 as a grid rule, no gain, not kept** (see below) | T2, T6 | medium-high (grid search) | on-structure % and columns in rooms |
| 8 | Bungalow split-bedroom preference | T11, T12 | medium | bungalow benchmark |
| 9 | Great room (living + dining + kitchen as one space) and courtyard/light-well types | T1–T4, T8–T16; T10, T14 | large (the gap-free engine plans walled rectangles) | — |

**#1 done (2026-10-20):** the label aliases are in `graph.ts` (type aliases and name keywords; car-space names are checked first, so "Car Porch" is parking, not a porch; gatehouse names now include plain "Security"). Labels recognised 52 → 74 of 83; the 9 left are deliberate (`Cabinet`, `Small cabinet`, the typo `Cym`, `Opt. Wine room`, and T16's estate items). Across every fixture and benchmark brief only 4 rooms change zone, all previously wrong (duplex car porch and gen house, flats security post, hotel generator house). Duplex benchmark 31/28 of 40 (was 30/28); harness 186/186, 240/240.

**#2 done (2026-10-20):** `openingSchedule` numbers doors by role — front door D1, room doors, bath/wardrobe doors, vehicle doors last (ties by size); windows unchanged (largest first). 24 sample plans: the front door is D1 in 0 → 24, a vehicle door D1 in 24 → 0. Browser (villa): D1 0.9 x 2.5 front door, D2 rooms, D3 baths, D4 7.5 m garage door. Seen while checking: an open car porch got a "vehicle door" in the schedule — **fixed the same day**: only an enclosed garage gets an overhead door; a carport, car porch or parking bay gets an open side (the street side between end posts, no door line, no tag, not in the schedule). Sample plans: every enclosed garage keeps its door; the duplex car porch is open (4.9 m).

**Recommended next was #1** (the label aliases). It's the change with the broadest evidence, it directly serves your earlier goal that rooms stop defaulting to "private", it's low risk, and it's fully measurable. **#3 is the most valuable planning change**, but it changes the planner's rules, so it needs your go-ahead first.

## 7. What I couldn't learn here, and what would help

- **Nigerian site items:** BQ, generator house, overhead tank, borehole, septic tank and soakaway don't appear in any template. Nigerian approved drawings (any LASPPPA-approved set) would fill this gap.
- **Setbacks:** no template dimensions its setbacks; T8, T14 and T16 show the house on its plot without figures. Our Lagos 6 / 3 / 3 residential figures can't be checked against this set.
- **CAD/PDF originals:** none are in the folder (only listing photos). T10's and T14's sheets are low resolution; T6/T7's 18-page set was readable only at title level. If you have the CAD or PDF files, the structural sheets (beam and footing sizes) and electrical layouts would read properly.
