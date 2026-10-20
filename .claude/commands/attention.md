---
description: "Show what needs a person today: workers at the lead removal level, reports owed to the regulator, unreported removals, tests overdue under the law, blood lead before a start date, drug screens not at the lab, reports not obtained, workers without their copy, programme tests overdue, removed workers ready to clear, hearing shifts with no follow-up, overdue actions, late lab results, employers not told, tests due soon and overdue invoices."
---

# attention

Show what needs a person today: workers at the lead removal level, reports owed to the regulator, unreported removals, tests overdue under the law, blood lead before a start date, drug screens not at the lab, reports not obtained, workers without their copy, programme tests overdue, removed workers ready to clear, hearing shifts with no follow-up, overdue actions, late lab results, employers not told, tests due soon and overdue invoices.

Run `node scripts/health.mjs attention`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with anything that breaks the law: a worker at or above the lead removal level, and reports or removals the regulator has not had. Suggest the one next step for each line (usually `/remove`, `/regulator`, `/draft-recall` or `/worker-copy`).
