---
description: "Invoice an employer for every test and drug and alcohol test done and not yet invoiced, up to --to, with GST (15% NZ, 10% AU). Never twice."
---

# invoice

Invoice an employer for every test and drug and alcohol test done and not yet invoiced, up to --to, with GST (15% NZ, 10% AU). Never twice.

Run `node scripts/health.mjs invoice <employer> [--to=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then `/documents` renders it. Nothing is sent.
