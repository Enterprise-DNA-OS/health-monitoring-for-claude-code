---
description: "Take a worker out of an exposure group from a date, with the reason."
---

# unassign

Take a worker out of an exposure group from a date, with the reason.

Run `node scripts/health.mjs unassign <worker> --group=<group> --reason="<reason>" [--to=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Offer an exit test if the programme has one.
