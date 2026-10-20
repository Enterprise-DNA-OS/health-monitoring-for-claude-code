---
description: "Change a house rule: recall_days, report_days, worker_copy_days, hearing_shift_db, lab_days, dna_tell_days, gst_nz_pct or gst_au_pct."
---

# set

Change a house rule: recall_days, report_days, worker_copy_days, hearing_shift_db, lab_days, dna_tell_days, gst_nz_pct or gst_au_pct.

Run `node scripts/health.mjs set <key> <value> --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

The law is not a setting. Point at docs/compliance.md if they ask to change one.
