---
description: "Remove a worker from lead risk work (r 415), with the reason. Then tell the regulator (r 415(2)) and arrange the medical examination (r 416)."
---

# remove

Remove a worker from lead risk work (r 415), with the reason. Then tell the regulator (r 415(2)) and arrange the medical examination (r 416).

Run `node scripts/health.mjs remove <worker> --reason="<reason>" [--date=YYYY-MM-DD] [--hazard=lead] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Do the next steps it lists in the same session.
