---
description: "Draft the worker's copy of their result in plain words, with the practitioner's recommendation and how the record is kept. Written to drafts/, never sent."
---

# draft-worker-letter

Draft the worker's copy of their result in plain words, with the practitioner's recommendation and how the record is kept. Written to drafts/, never sent.

Run `node scripts/health.mjs draft-worker-letter <ref>`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then, once it is given, `/worker-copy`.
