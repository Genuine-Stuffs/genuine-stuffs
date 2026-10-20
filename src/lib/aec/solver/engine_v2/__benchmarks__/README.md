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

The hotel brief (`bench-04-hotel-30x40`, 2026-10-20) is hand-written too: per
guest floor 12 standard rooms (24 m², en-suite inside the room) and 3 suites
(40 m²), a housekeeping store, a lift core and a stair off a central corridor;
the ground floor as the prompt lists it. Room sizes are planning assumptions,
not code figures; the restaurant's area for 60 seats in particular should
come from the occupancy engine (capability C) once it exists.
