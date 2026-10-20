---
description: "Tests done in the last 90 days (or --days=N), filtered by --worker or --employer, with the result and where the report stands."
---

# tests

Tests done in the last 90 days (or --days=N), filtered by --worker or --employer, with the result and where the report stands.

Run `node scripts/health.mjs tests [--worker=<worker>] [--employer=<employer>] [--days=N]`. Add `--json` when you need every field. Resolve the worker, employer, group or test by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Newest first. Abnormal results first if the operator asks what needs attention.
