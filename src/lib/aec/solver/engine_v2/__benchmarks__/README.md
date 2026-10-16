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
