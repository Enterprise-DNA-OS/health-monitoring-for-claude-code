---
description: "Close a follow-up action with its outcome."
---

# close-action

Close a follow-up action with its outcome.

Run `node scripts/health.mjs close-action <action ref> --outcome="<what happened>" [--date=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Copy the outcome from the operator.
