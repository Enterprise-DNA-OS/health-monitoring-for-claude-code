---
description: "Record the practitioner's report: normal or abnormal, any disease indicated, any remedial measures recommended (with the recommendation), and whether the worker can keep doing the work. Says whether the regulator must get a copy."
---

# report

Record the practitioner's report: normal or abnormal, any disease indicated, any remedial measures recommended (with the recommendation), and whether the worker can keep doing the work. Says whether the regulator must get a copy.

Run `node scripts/health.mjs report <ref> --result=<normal|abnormal> [--disease] [--remedial] [--recommendation="<as written>"] [--fit=<fit|restricted|unfit>] [--value=N] [--date=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Copy the findings from the report. Never decide disease or fitness yourself. Then do the next steps it lists.
