---
description: "Draft an employer's summary for a period (default the last 90 days): tests done, abnormal results and whether the regulator has them, and who is due next. Written to drafts/, never sent."
---

# draft-employer-report

Draft an employer's summary for a period (default the last 90 days): tests done, abnormal results and whether the regulator has them, and who is due next. Written to drafts/, never sent.

Run `node scripts/health.mjs draft-employer-report <employer> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Check every line before it goes to the employer.
