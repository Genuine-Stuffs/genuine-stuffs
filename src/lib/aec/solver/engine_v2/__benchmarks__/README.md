# Benchmark briefs

The owner's benchmark prompts (2026-10-08), each with a Hive room program
(`<name>.json`) and the user's prompt (`<name>.prompt.txt`). These run outside
`npm run harness`, so they measure progress without changing its pass count.

The Hive programs are **hand-written** in the live Hive's format (compare
`__fixtures__/hive-007-*`), not captured from the model. Replace each one with a
real capture when one is available.

Only the residential briefs (duplex, bungalow) are here: the flats, hotel and
church briefs need engine features that don't exist yet (3+ storeys, lift
cores, seating, clear spans).
