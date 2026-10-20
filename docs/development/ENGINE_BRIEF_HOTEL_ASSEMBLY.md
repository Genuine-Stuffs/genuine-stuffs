# Engine Brief: Hotel & Assembly Building Types

Owner's brief, 2026-10-20. The PDF is `docs/design-references/pdfs/Engine-Brief-Hotel-and-Assembly-Building-Types.pdf`; this is its text, kept here so it can be searched and linked. Progress is tracked in `PROJECT_LEDGER.md` §6 item 13. Done so far: A (honest gate, `ef3643b`); B (room catalogue, `room_catalogue.ts`) and E (hospitality and assembly setbacks: no cited figure found, the Lagos commercial setbacks used as a documented fallback and stated on each plan).

Adding hotel and assembly (place-of-worship) floor plans needs one shared capability layer plus two type configs on top. None of it exists today. Building the shared layer once also unlocks factories, schools and banks later.

## Shared foundation (both types need these)

| # | Capability | What it does | Build note |
|---|---|---|---|
| A | Honest-output gate | Requires a valid, area-checked plan to exist before anything renders. No plan → no 3D picture; the pre-screen returns "not supported yet" or "couldn't fit", never a false "pass". | Do first: small, independent, and it stops misleading results today. |
| B | Non-residential room-type library | A typed catalogue, so unknown rooms stop defaulting to *private*. Each entry carries its category (habitable / wet / service / circulation / assembly), a wet-room flag (water and ventilation), its minimum area and proportions, and its adjacency rules (e.g. kitchen to restaurant, housekeeping to corridor). | Cheap config once the structure exists. Add the hotel and assembly vocabularies listed per brief below. |
| C | Occupancy engine | Takes a capacity (guests, seats) and computes the number and width of exits, the number of stairs, and restroom fixtures by sex. | The constants (occupant-load factors, exit width per person, fixtures per N people) must be read from the Nigerian National Building Code / Lagos code, never guessed: a lookup table keyed to the code, so a value is corrected in one place. |
| D | Structural-system selector | Replaces the single 6 m bay rule with a choice: *framed* (≤ 6 m bays, as now) for cellular layouts, or *long-span* (portal frame / steel truss, about 12–30 m clear) for halls. | A room flagged "assembly" or "wide-span" routes to the long-span system instead of failing the span check. |
| E | Zoning / setback categories | Adds **hospitality** and **place-of-worship / assembly** beyond residential and Lagos-commercial. | Each needs a cited setback source. Where Lagos has no assembly category, document the fallback chosen rather than silently using commercial. |

## Brief 4: Hotel / lodging

**Why it fails now:** every guest-service room defaults to private, the restaurant wants a span over 6 m, and there is no guest-count logic for egress.

**Room-type additions:** reception, lobby, lounge/bar, restaurant (assembly / long-span flag), back-of-house kitchen (wet), guest room, suite, housekeeping store (service), lift core, admin office, staff facilities, laundry (wet).

**Type-specific logic to add:**

1. **Double-loaded corridor generator:** a typical floor is rooms either side of a central circulation spine; the engine places a repeating room module along a corridor, not each room as a free object.
2. **Typical-floor repetition:** design one guest floor, stack it N times with the core aligned, and generate a distinct ground floor underneath (extends the flats stacking already proven).
3. **Vertical transport:** a lift core plus the code-required number of fire-escape stairs, sized by occupancy (capability C).
4. **Public / back-of-house separation:** an adjacency rule so guests and service don't share circulation.

**Acceptance criteria:**

- [ ] Generates a repeatable guest floor with rooms off a central corridor, the core aligned floor to floor.
- [ ] The restaurant renders as one clear span with no false span warning.
- [ ] Exit and stair counts change correctly when the guest count changes.
- [ ] Refuses honestly if the program can't fit, with no render.

**Reference prompt it must eventually pass:** the original boutique-hotel prompt (4 storeys, 30 × 40 m plot, 15 rooms per floor, restaurant, lift and fire stair), unchanged. That prompt *is* the acceptance test.

## Brief 5: Assembly / place of worship

The heavier build: a project of its own.

**Why it fails now:** no assembly setback, every auditorium room defaults to private, the 25 m hall blows the 6 m cap, and the 1,000-seat exits and restrooms aren't computed.

**Room-type additions:** auditorium / main hall (assembly + long-span), stage/altar, choir area, instrument store, overflow / children's section, entrance foyer, vestry, office, ushers' room, bookshop, crèche / nursing room (wet), congregation restrooms (wet, fixture-count driven).

**Type-specific logic to add:**

1. **Seating-layout module:** from a seat count, lay out banked seating with a central aisle and two side aisles, aisle widths from the code, and a clear sightline to the stage. The core new capability and the hardest.
2. **Capacity-driven egress:** the seat count drives the minimum number of exits, the total exit width and their distribution around the hall (capability C). Four exits is a computed minimum, not a fixed assumption.
3. **Long-span roof:** route the hall to the portal / truss system (capability D), with a sanity range of about 15–30 m instead of the 6 m rule.
4. **Gallery / mezzanine:** an optional upper level over the foyer for offices, bookshop and restrooms, so support spaces don't eat the main-floor footprint (how real auditoriums fit the program).
5. **Fixture sizing:** restrooms sized to the congregation through capability C, not a fixed room.

**Acceptance criteria:**

- [ ] Lays out about 1,000 seats with code-compliant aisles and a clear sightline to the stage.
- [ ] The hall gets a column-free (or minimal-column) long-span roof with no false span warning.
- [ ] Exit number and width, and restroom fixtures, scale with the seat count.
- [ ] Uses an assembly setback with a documented source, not commercial by default.
- [ ] Support spaces fit, using a gallery when the ground floor is tight, or the plan refuses honestly.

**Reference prompt it must eventually pass:** the original 1,000-seat church prompt, unchanged.

## Build order

Cheapest and least misleading first; the genuinely new work last.

1. **Capability A, the honest gate.** Small and independent; it stops false passes and word-only renders today.
2. **Capabilities B + E, room types and zoning.** Cheap config once A exists; no new models.
3. **Hotel.** The smaller leap: it reuses the existing flats stacking and only needs the corridor generator and the occupancy engine (C).
4. **Assembly / church.** Last: the seating module and the long-span roof are genuinely new. The flagship, built once the rest is proven.

## What the screenshots showed (2026-10-20, live site)

- **Church (40 × 60 m plot):** no plan. The rooms total 1,730 m² on one floor (about 1,938 m² with walls and circulation), and the Lagos *commercial* setbacks (front 9 m, rear 3 m, sides 6 m) leave 28 × 48 m = 1,344 m². The room types `assembly_hall`, `stage`, `multi_purpose`, `restroom` and `retail` fell back to *private*. The pre-screen warned "span of 4.5 m is close to the 4.5 m limit" for the 25 m auditorium (the AI set 4.5 m on every room), and showed "4 passed, 0 failed" with no plan. The exterior render showed a glass house, not a church.
- **Bungalow (12 × 18 m plot):** no plan under the Lagos defaults (6 × 9 m = 54 m² buildable against 119 m² of rooms); the message didn't name the NBC high-density option (8 × 11.5 m = 92 m², which plans the benchmark with rooms about 20 % smaller). Capability A's message work covers this too.
