---
description: "Bring workers (with their exposure group) or test history across from a Cority export (comma-separated). Dry run first. Import workers, then tests."
---

# import

Bring workers (with their exposure group) or test history across from a Cority export (comma-separated). Dry run first. Import workers, then tests.

Run `node scripts/health.mjs import cority <file.csv> --kind=<workers|tests> [--employer=<employer>] [--map=map.json] [--dry-run] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Always dry run first and show the counts. One bad row stops the file; say which row and why.
