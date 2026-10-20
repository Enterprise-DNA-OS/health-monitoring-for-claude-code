---
description: "The recall list: every test due in the next 30 days (or --days=N) or overdue, with the rule that sets each date. Filter by --employer."
---

# due

The recall list: every test due in the next 30 days (or --days=N) or overdue, with the rule that sets each date. Filter by --employer.

Run `node scripts/health.mjs due [--employer=<employer>] [--days=N]`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Group by employer when there is more than one. Overdue first. Quote the rule column when someone asks why a date is what it is.
