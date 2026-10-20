---
description: "Draft the letter to an employer listing who to send for testing in the next 45 days (or --days=N), with the rule behind each date. Written to drafts/, never sent."
---

# draft-recall

Draft the letter to an employer listing who to send for testing in the next 45 days (or --days=N), with the rule behind each date. Written to drafts/, never sent.

Run `node scripts/health.mjs draft-recall <employer> [--days=N]`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Say who it is addressed to and how many tests it lists.
