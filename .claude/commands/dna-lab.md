---
description: "Record a sample sent to the laboratory (--sent=date), or the laboratory's result (--result=negative|positive)."
---

# dna-lab

Record a sample sent to the laboratory (--sent=date), or the laboratory's result (--result=negative|positive).

Run `node scripts/health.mjs dna-lab <ref> --sent=YYYY-MM-DD | --result=<negative|positive> [--date=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Copy the laboratory's result exactly.
