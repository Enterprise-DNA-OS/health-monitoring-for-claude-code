---
description: "Record a report going to someone other than the worker or the regulator: another business with the same duty (other-pcbu), a person bound by professional confidentiality (professional), or anyone else with the worker's written consent (consented, --consent=date). Refuses without consent."
---

# disclose

Record a report going to someone other than the worker or the regulator: another business with the same duty (other-pcbu), a person bound by professional confidentiality (professional), or anyone else with the worker's written consent (consented, --consent=date). Refuses without consent.

Run `node scripts/health.mjs disclose <ref> --to="<who>" --purpose=<other-pcbu|professional|consented> [--consent=YYYY-MM-DD] [--date=YYYY-MM-DD] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

If there is no written consent, say so and stop.
