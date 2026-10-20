---
description: "Add a similar exposure group to an employer: the workers who do the same work and need the same tests."
---

# add-group

Add a similar exposure group to an employer: the workers who do the same work and need the same tests.

Run `node scripts/health.mjs add-group --code=<CODE> --employer=<employer> --name="<name>" [--description="<what they do>"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then `/add-programme` for each test the group needs.
