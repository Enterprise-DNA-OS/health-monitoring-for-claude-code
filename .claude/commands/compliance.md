---
description: "Check the records against the rules in docs/compliance.md, law first, each with its source: audiograms, blood lead intervals, removals, regulator copies, reports, workers' copies, the practitioner's programme, drug screens and follow-ups."
---

# compliance

Check the records against the rules in docs/compliance.md, law first, each with its source: audiograms, blood lead intervals, removals, regulator copies, reports, workers' copies, the practitioner's programme, drug screens and follow-ups.

Run `node scripts/health.mjs compliance`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with the law rows. For each, name the first case and the command that fixes it. Nothing here is legal advice; if a rule looks out of date, say so and stop.
