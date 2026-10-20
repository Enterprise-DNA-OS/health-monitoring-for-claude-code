# Example exports

`cority/employees.csv` and `cority/tests.csv` are invented records in the shape of a Cority report export: one row per employee, one row per test. They exist so `npm test` can prove the import, and so you can try it before you export your own:

```bash
node scripts/health.mjs import cority examples/cority/employees.csv --kind=workers --employer=RFL --actor="Your name" --dry-run
node scripts/health.mjs import cority examples/cority/tests.csv --kind=tests --actor="Your name" --dry-run
```

Your own export will have other headings. Pass `--map=map.json` with `{ "<field>": "<your heading>" }` for any that differ. See `docs/replace-cority.md`.
