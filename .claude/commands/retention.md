---
description: "How long each worker's health monitoring reports must be kept (30 years, 40 for asbestos), by hazard. Filter by --worker."
---

# retention

How long each worker's health monitoring reports must be kept (30 years, 40 for asbestos), by hazard. Filter by --worker.

Run `node scripts/health.mjs retention [--worker=<worker>]`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Remind the operator records are never deleted, even for workers who have left.
