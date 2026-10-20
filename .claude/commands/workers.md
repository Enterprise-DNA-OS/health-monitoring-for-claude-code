---
description: "Every worker (or --employer=<employer>): role, status, exposure groups, next test due and how many are overdue."
---

# workers

Every worker (or --employer=<employer>): role, status, exposure groups, next test due and how many are overdue.

Run `node scripts/health.mjs workers [--employer=<employer>]`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Keep it to the columns the operator asked about.
