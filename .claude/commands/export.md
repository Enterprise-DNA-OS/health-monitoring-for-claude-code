---
description: "Export every record to one JSON file the business owns. It holds confidential health records: keep it as securely as the database."
---

# export

Export every record to one JSON file the business owns. It holds confidential health records: keep it as securely as the database.

Run `node scripts/health.mjs export [--out=<file>]`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Give the path and remind the operator the file is confidential.
