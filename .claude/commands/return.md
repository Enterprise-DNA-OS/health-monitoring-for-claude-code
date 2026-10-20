---
description: "Return a removed worker to lead risk work. Refuses unless a blood lead since the removal is below the return level (r 417(3)(a)) and a doctor has cleared them (--cleared-by, r 417(3)(b))."
---

# return

Return a removed worker to lead risk work. Refuses unless a blood lead since the removal is below the return level (r 417(3)(a)) and a doctor has cleared them (--cleared-by, r 417(3)(b)).

Run `node scripts/health.mjs return <worker> --cleared-by="<doctor>" [--date=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If it refuses, say which condition is missing and stop. Never look for a way around it.
