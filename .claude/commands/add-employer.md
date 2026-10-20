---
description: "Add an employer. The region sets the rules and the currency: NZ (NZD), or an Australian state or territory (AUD)."
---

# add-employer

Add an employer. The region sets the rules and the currency: NZ (NZD), or an Australian state or territory (AUD).

Run `node scripts/health.mjs add-employer --code=<CODE> --name="<name>" --region=<NZ|NSW|VIC|QLD|WA|SA|TAS|ACT|NT> [--contact="<name>"] [--email=<email>] [--address="<address>"] [--invoice-days=N] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Then suggest `/add-group`.
