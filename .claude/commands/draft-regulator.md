---
description: "Draft the cover note when a report goes to the regulator (WorkSafe New Zealand or the state regulator), with the rule that requires it. Written to drafts/, never sent."
---

# draft-regulator

Draft the cover note when a report goes to the regulator (WorkSafe New Zealand or the state regulator), with the rule that requires it. Written to drafts/, never sent.

Run `node scripts/health.mjs draft-regulator <ref>`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then, once lodged, `/regulator` with their reference.
