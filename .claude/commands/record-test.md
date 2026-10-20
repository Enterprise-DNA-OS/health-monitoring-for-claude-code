---
description: "Record a test done: worker, test, date, practitioner and the value if there is one (dB shift, ug/dL, FEV1 %). The result stays pending until the report comes back. A blood lead at the removal level or a hearing shift over the trigger is flagged at once."
---

# record-test

Record a test done: worker, test, date, practitioner and the value if there is one (dB shift, ug/dL, FEV1 %). The result stays pending until the report comes back. A blood lead at the removal level or a hearing shift over the trigger is flagged at once.

Run `node scripts/health.mjs record-test <worker> --test=<audiogram|blood-lead|spirometry|chest-xray|questionnaire> [--done=YYYY-MM-DD] [--value=N] [--practitioner="<name>"] [--kind=<baseline|periodic|follow-up|exit|return>] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If a warning comes back, say it first and offer the command it names. Copy values from the result, never estimate.
