# Moving from Cority

Bring your workers and their test history across in an afternoon. Do a dry run first: it counts what would come across and keeps nothing.

## 1. Set up the employer and its exposure groups

Imports need somewhere to land. For each employer:

```bash
node scripts/health.mjs add-employer --code=RFL --name="Ruahine Foundry Ltd" --region=NZ --actor="Your name"
node scripts/health.mjs add-group --code=RFL-POUR --employer=RFL --name="Pouring and fettling" --actor="Your name"
node scripts/health.mjs add-programme RFL-POUR --test=audiogram --hazard=noise --every=12 --actor="Your name"
```

Use the group codes or names your Cority similar exposure groups already have, so the employee export finds them.

## 2. Export from Cority

From Cority's reporting, export two comma-separated files:

- **Employees:** Employee ID, First Name, Last Name (or Employee Name), Date of Birth, Job Title, Hire Date, Similar Exposure Group, Employment Status.
- **Tests:** Test ID, Employee ID, Test Type, Test Date, Result Value, Result, Clinician, Hazard.

Dates can be `YYYY-MM-DD` or day first (`21/10/2026`). `examples/cority/` has a small example of each.

## 3. Import, dry run first

```bash
node scripts/health.mjs import cority employees.csv --kind=workers --employer=RFL --actor="Your name" --dry-run
node scripts/health.mjs import cority employees.csv --kind=workers --employer=RFL --actor="Your name"
node scripts/health.mjs import cority tests.csv --kind=tests --actor="Your name" --dry-run
node scripts/health.mjs import cority tests.csv --kind=tests --actor="Your name"
```

Imports are atomic: one bad row stops the whole file and names the row. Rows already imported are skipped, so you can run a file again after fixing it.

## What maps

| Cority | Here |
|---|---|
| Employee ID | `workers.code` and `external_id` (`cority:<id>`) |
| First and Last Name, or Employee Name | `workers.name` |
| Date of Birth, Job Title, Hire Date | `dob`, `role`, `started_on` |
| Similar Exposure Group | an assignment to the group with that code or name, from the hire date |
| Employment Status (Terminated, Inactive, Left) | `status = left`; their records stay |
| Test Type (Audiometry, Blood Lead, Spirometry, Chest X-Ray, Questionnaire) | `test_code` |
| Test Date, Result Value, Clinician | `done_on`, `value`, `practitioner` |
| Result (anything with abnormal, fail, refer or positive) | `result = abnormal`, otherwise `normal` |
| Hazard | `hazard_code` (noise and lead are filled in for audiograms and blood lead; pass `--hazard` for the rest) |

Your report will have other headings. Write a map file and pass `--map=map.json`: `{ "worker": "Person Number", "done": "Encounter Date" }`. The field names are in `MAPS` in `scripts/lib/domain.mjs`.

## What does not carry over

- **Report dates.** Imported tests are marked as reported and given to the worker on the test date, because Cority already handled them. Check anything recent with `/reports`.
- **Disease indicated, remedial measures and recommendations.** Re-enter them with `/report` for any result that still needs action.
- **Removals, follow-up actions and disclosures.** Add open ones with `/remove`, `/add-action` and `/disclose`.
- **Drug and alcohol tests, scanned documents and audiogram traces.** Keep your Cority export of these as the archive. Health monitoring records must be kept 30 years (40 for asbestos).

Once imported, run `/compliance` and `/due`: anyone overdue under the law shows on the first day.
