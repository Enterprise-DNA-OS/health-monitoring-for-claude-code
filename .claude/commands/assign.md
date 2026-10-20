---
description: "Put a worker in an exposure group from a date. Shows the tests that start, with the rule behind each date (a blood lead before lead risk work starts, an audiogram within 3 months)."
---

# assign

Put a worker in an exposure group from a date. Shows the tests that start, with the rule behind each date (a blood lead before lead risk work starts, an audiogram within 3 months).

Run `node scripts/health.mjs assign <worker> --group=<group> --from=YYYY-MM-DD --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say which test must happen before the start date.
