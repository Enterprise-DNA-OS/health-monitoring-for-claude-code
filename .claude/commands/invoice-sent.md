---
description: "Record that an invoice was sent."
---

# invoice-sent

Record that an invoice was sent.

Run `node scripts/health.mjs invoice-sent <invoice> [--date=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Recording it does not send it.
