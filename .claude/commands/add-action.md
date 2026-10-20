---
description: "Add a follow-up action for a worker, optionally tied to a test: a retest, a referral, a hearing protection refit."
---

# add-action

Add a follow-up action for a worker, optionally tied to a test: a retest, a referral, a hearing protection refit.

Run `node scripts/health.mjs add-action <worker> --what="<what>" --due=YYYY-MM-DD [--test=<ref>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Confirm the due date with the operator.
