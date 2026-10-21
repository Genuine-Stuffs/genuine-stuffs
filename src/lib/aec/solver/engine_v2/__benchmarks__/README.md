# Benchmark briefs

The owner's benchmark prompts (2026-10-08), each with a Hive room program
(`<name>.json`) and the user's prompt (`<name>.prompt.txt`). These run outside
`npm run harness`, so they measure progress without changing its pass count.

The Hive programs are **hand-written** in the live Hive's format (compare
`__fixtures__/hive-007-*`), not captured from the model. Replace each one with a
real capture when one is available.

The flats brief (`bench-03-flats-20x30`) marks each flat's rooms with
`unit` ("Flat 1" ...): a flat's rooms open into its entrance (the room linked
to the landing). Its parking, gate security post and overhead tank are site
items the engine doesn't model yet (the post is listed as a room).
The hotel and church briefs need features that don't exist yet (lift cores,
seating, clear spans).

The hotel and church briefs were rewritten on 2026-10-21 (owner: the example
prompts are test inputs, never sources of truth; plans follow the codes).
Both are sized by `src/lib/aec/regulations/` from the Lagos Physical Planning
Permit Regulations 2019 and the NBC 2006 (reports/Hotel and church design
guidelines.md):

- `bench-04-hotel-30x40`: 3-star, 47 rooms, 4 storeys on 30 x 40 m outside
  the traditional core. Commercial setbacks 9 / 4.5 / 4.5 m, 70% coverage, two
  1.2 m escape stairs (Lagos Reg 24(12)), a guest lift and a service lift,
  3 accessible rooms, rooms 24 m² and suites 40 m² (3-star targets 15 + 5 and
  24 + 10 m²), 19 parking bays.
- `bench-05-church-60x80`: 1,000 seats on a 60 x 80 m standard plot (the
  earlier 40 x 60 m broke the 50% coverage and the parking rule). Hall
  33.9 x 20.8 m (straight rows, 0.95 m pitch, 14 seats between aisles),
  stage 163 m², choir 80 m², occupant load about 1,170 so 4 exits with a
  3 m main entrance, 17 + 6 WCs and 8 urinals, 10 wheelchair spaces, 95
  parking bays. Its plan sizes are defaults the user can change; the
  plot, exits and toilet floor are law.
