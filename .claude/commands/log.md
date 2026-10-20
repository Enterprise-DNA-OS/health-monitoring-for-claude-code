---
description: "Add a note to the activity log about a worker, employer, test or removal."
---

# log

Add a note to the activity log about a worker, employer, test or removal.

Run `node scripts/health.mjs log <ref> --note="<note>" --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Keep health details out of notes; they belong on the test.
