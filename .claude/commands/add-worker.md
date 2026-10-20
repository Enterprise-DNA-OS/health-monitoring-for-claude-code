---
description: "Add a worker to an employer. --lower-lead marks a worker the lower blood lead levels apply to (female of reproductive capacity, r 407, 415, 417)."
---

# add-worker

Add a worker to an employer. --lower-lead marks a worker the lower blood lead levels apply to (female of reproductive capacity, r 407, 415, 417).

Run `node scripts/health.mjs add-worker --code=<CODE> --employer=<employer> --name="<name>" [--dob=YYYY-MM-DD] [--role="<role>"] [--started=YYYY-MM-DD] [--lower-lead] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then `/assign` them to an exposure group. Never guess a date of birth or the lower-lead flag: ask.
