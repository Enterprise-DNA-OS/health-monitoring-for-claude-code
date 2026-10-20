---
description: "Record that the employer was told a drug and alcohol result. Shows the result that can be given: a non-negative screen goes out as non-negative, not confirmed, until the lab confirms it."
---

# dna-told

Record that the employer was told a drug and alcohol result. Shows the result that can be given: a non-negative screen goes out as non-negative, not confirmed, until the lab confirms it.

Run `node scripts/health.mjs dna-told <ref> [--date=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Tell the operator the exact words to use (result_given).
