---
description: "Record a drug or alcohol test collected: reason, sample (urine, oral fluid or breath), the on-site screen, the drug class, and for breath the reading (--brac)."
---

# dna

Record a drug or alcohol test collected: reason, sample (urine, oral fluid or breath), the on-site screen, the drug class, and for breath the reading (--brac).

Run `node scripts/health.mjs dna <worker> --reason=<pre-employment|random|post-incident|reasonable-cause|return-to-work> --sample=<urine|oral-fluid|breath> --screen=<negative|non-negative> [--class="<drug class>"] [--brac=0.000] [--at="YYYY-MM-DD HH:MM"] --actor="<your name>"`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

A non-negative urine or oral fluid screen is not a positive. It goes to the laboratory (`/dna-lab`).
