# Health Monitoring for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS: an occupational health provider, or the employer that runs its own programme]
- **Operator:** [YOUR NAME], [your role: occupational health nurse, practice manager, health and safety manager]
- **What matters most:** [for example: nobody stays in lead work at the removal level, every report the regulator must get goes the same week]

The work is health monitoring for workers exposed to noise, lead, silica, isocyanates, wood dust or asbestos in New Zealand or Australia: employers and their workers, exposure groups and the tests each group needs, results and the reports that follow them, removals from lead risk work, follow-ups, drug and alcohol tests, and invoices for the testing.

## Rules

- Read the CLI result before answering. Every answer about a worker, test, employer or removal starts with data from `node scripts/health.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- These are confidential health records. Show a worker's results only to the operator. A report goes to someone other than the worker, the employer that commissioned it, another business with the same duty, or the regulator only with the worker's written consent (`/disclose` refuses without it).
- Never decide a result. Disease indicated, remedial measures, fitness for the work and every value are copied from the practitioner's report or the laboratory, never inferred.
- A blood lead at or above the removal level means remove now (`/remove`) and tell the regulator. A removed worker returns only when `/return` allows it. If the law says no, say why and stop. Never look for a way around it.
- A non-negative drug screen is not a positive. Say "non-negative, not confirmed" until the laboratory confirms it.
- Every write names `--actor`. That is a label in the activity log, not a verified identity.
- Never invent a date of birth, a value, a regulator reference, a consent date or a doctor's clearance. Copy them from the report, the form or the operator.
- Never send, call, pay or delete. Letters, recall lists and summaries are drafts in `drafts/`; documents are in `docs-out/`. Recording a copy as given does not give it; a person does that. Health monitoring records are never deleted (30 years, 40 for asbestos), and the database refuses.
- The rules in `docs/compliance.md` are records checks, not legal or medical advice. If a rule looks out of date, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Every follow-up action, overdue first. --open hides closed ones. | `/actions` |
| The activity log for the last 7 days (or --days=N): who did what. | `/activity` |
| Add a follow-up action for a worker, optionally tied to a test: a retest, a referral, a hearing protection refit. | `/add-action` |
| Add an employer. The region sets the rules and the currency: NZ (NZD), or an Australian state or territory (AUD). | `/add-employer` |
| Add a similar exposure group to an employer: the workers who do the same work and need the same tests. | `/add-group` |
| Add a test to a group's programme, for a hazard. Audiograms and blood lead in model WHS states take their interval from the law; everything else needs the practitioner's interval (--every, months). --statutory marks monitoring the regulations require (so the regulator duties apply). | `/add-programme` |
| Add a worker to an employer. --lower-lead marks a worker the lower blood lead levels apply to (female of reproductive capacity, r 407, 415, 417). | `/add-worker` |
| Put a worker in an exposure group from a date. Shows the tests that start, with the rule behind each date (a blood lead before lead risk work starts, an audiogram within 3 months). | `/assign` |
| Show what needs a person today: workers at the lead removal level, reports owed to the regulator, unreported removals, tests overdue under the law, blood lead before a start date, drug screens not at the lab, reports not obtained, workers without their copy, programme tests overdue, removed workers ready to clear, hearing shifts with no follow-up, overdue actions, late lab results, employers not told, tests due soon and overdue invoices. | `/attention` |
| Close a follow-up action with its outcome. | `/close-action` |
| Check the records against the rules in docs/compliance.md, law first, each with its source: audiograms, blood lead intervals, removals, regulator copies, reports, workers' copies, the practitioner's programme, drug screens and follow-ups. | `/compliance` |
| Make this system yours in plain language. Add a field, rename a status, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Record a report going to someone other than the worker or the regulator: another business with the same duty (other-pcbu), a person bound by professional confidentiality (professional), or anyone else with the worker's written consent (consented, --consent=date). Refuses without consent. | `/disclose` |
| Who a worker's reports have been given to (other than the worker and the regulator), and the written consent behind each. | `/disclosures` |
| Record a drug or alcohol test collected: reason, sample (urine, oral fluid or breath), the on-site screen, the drug class, and for breath the reading (--brac). | `/dna` |
| Record a sample sent to the laboratory (--sent=date), or the laboratory's result (--result=negative|positive). | `/dna-lab` |
| Every drug and alcohol test: reason, sample, screen, lab result, the result that can be reported, and where it stands. --open hides finished ones. | `/dna-tests` |
| Record that the employer was told a drug and alcohol result. Shows the result that can be given: a non-negative screen goes out as non-negative, not confirmed, until the lab confirms it. | `/dna-told` |
| Render health monitoring reports, employer recall lists, lead removal notices and tax invoices as branded HTML from the records. | `/documents` |
| Draft an employer's summary for a period (default the last 90 days): tests done, abnormal results and whether the regulator has them, and who is due next. Written to drafts/, never sent. | `/draft-employer-report` |
| Draft the letter to an employer listing who to send for testing in the next 45 days (or --days=N), with the rule behind each date. Written to drafts/, never sent. | `/draft-recall` |
| Draft the cover note when a report goes to the regulator (WorkSafe New Zealand or the state regulator), with the rule that requires it. Written to drafts/, never sent. | `/draft-regulator` |
| Draft the worker's copy of their result in plain words, with the practitioner's recommendation and how the record is kept. Written to drafts/, never sent. | `/draft-worker-letter` |
| The recall list: every test due in the next 30 days (or --days=N) or overdue, with the rule that sets each date. Filter by --employer. | `/due` |
| Everything about one employer: its exposure groups and their programmes, tests not current, and reports not done. | `/employer` |
| Every employer: region, currency, contact, active workers, overdue tests and what they owe. | `/employers` |
| Export every record to one JSON file the business owns. It holds confidential health records: keep it as securely as the database. | `/export` |
| Every exposure group (or --employer=<employer>): workers in it and its programme. | `/groups` |
| Bring workers (with their exposure group) or test history across from a Cority export (comma-separated). Dry run first. Import workers, then tests. | `/import` |
| The ten questions Cority's dashboards do not answer: hearing shifts, blood lead by group against last year, overdue workers by group, practitioner report times, worker copy times, repeat abnormal results, lab confirmation rates, FEV1 drops, unbilled work, and records kept for workers who have left. | `/insights` |
| Invoice an employer for every test and drug and alcohol test done and not yet invoiced, up to --to, with GST (15% NZ, 10% AU). Never twice. | `/invoice` |
| Record that an invoice was paid. | `/invoice-paid` |
| Record that an invoice was sent. | `/invoice-sent` |
| Every invoice with its standing: not sent, sent, overdue or paid. | `/invoices` |
| Every worker in lead risk work: last blood lead against the removal and return levels, any removal, the standing and the next test date. | `/lead` |
| Add a note to the activity log about a worker, employer, test or removal. | `/log` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in your brand by `npm run view`. | `/new-view` |
| One exposure group's programme: which tests, for which hazard, how often, and whether the law or the practitioner sets the interval. | `/programme` |
| Record a test done: worker, test, date, practitioner and the value if there is one (dB shift, ug/dL, FEV1 %). The result stays pending until the report comes back. A blood lead at the removal level or a hearing shift over the trigger is flagged at once. | `/record-test` |
| Record that a copy of the report went to the regulator, with their reference (NZ reg 41, AU r 376 and r 413). | `/regulator` |
| Record that the regulator was told about a removal from lead risk work (r 415(2)). | `/removal-reported` |
| Every removal from lead risk work: when, why, when the regulator was told, and the return with the doctor who cleared it. | `/removals` |
| Remove a worker from lead risk work (r 415), with the reason. Then tell the regulator (r 415(2)) and arrange the medical examination (r 416). | `/remove` |
| Record the practitioner's report: normal or abnormal, any disease indicated, any remedial measures recommended (with the recommendation), and whether the worker can keep doing the work. Says whether the regulator must get a copy. | `/report` |
| Every test with its report duties: report obtained, worker's copy, regulator's copy, and where it stands. --open hides finished ones. | `/reports` |
| How long each worker's health monitoring reports must be kept (30 years, 40 for asbestos), by hazard. Filter by --worker. | `/retention` |
| Return a removed worker to lead risk work. Refuses unless a blood lead since the removal is below the return level (r 417(3)(a)) and a doctor has cleared them (--cleared-by, r 417(3)(b)). | `/return` |
| Change a house rule: recall_days, report_days, worker_copy_days, hearing_shift_db, lab_days, dna_tell_days, gst_nz_pct or gst_au_pct. | `/set` |
| The house rules and their values: recall window, report and worker-copy days, the hearing shift trigger, lab days, the employer-told window and GST. | `/settings` |
| One test in full: result, recommendation, report dates, who it has been disclosed to and its activity. | `/test` |
| Tests done in the last 90 days (or --days=N), filtered by --worker or --employer, with the result and where the report stands. | `/tests` |
| Take a worker out of an exposure group from a date, with the reason. | `/unassign` |
| Tests and drug and alcohol tests done and not yet invoiced, by employer. | `/unbilled` |
| Render the read-only dashboards in views.json (this week, the recall list, the lead register, money) as HTML in your brand. | `/view` |
| Write the Monday review to drafts/ from attention, compliance, the recall list, lead and unbilled work. | `/weekly-review` |
| Everything about one worker: groups, tests due with the rule behind each date, recent results, removals, actions and drug and alcohol tests. | `/worker` |
| Record that the worker was given a copy of their report (NZ reg 39, AU r 375). | `/worker-copy` |
| Mark a worker as left (or active again) with the reason. Their groups close, every record stays, and the exit tests their programme offers are listed. | `/worker-status` |
| Every worker (or --employer=<employer>): role, status, exposure groups, next test due and how many are overdue. | `/workers` |

If an ask fits nothing here, run `node scripts/health.mjs --help`, answer from the records, then propose a new command for it.

## Where things live

- `scripts/health.mjs` is the one CLI. `scripts/lib/domain.mjs` holds its rules.
- `supabase/migrations/` is the schema in plain SQL. `v_due` (the recall list, with the rule behind each date), `v_reports` (the report duties), `v_lead` (removal and return levels) and `v_dna` hold the rules in one place: the CLI, the views and the documents all read them. `npm run migrate` applies it. `DATABASE_URL` chooses Postgres; unset, it uses PGlite in `.data/`.
- `settings` holds the house rules (`set` changes them). Laws and their sources are in `docs/compliance.md`.
- `views.json` and `documents.json` define the dashboards and documents. `brand.json` is your name, colours and logo.
- `docs/replace-cority.md` is the switching guide.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=cority&utm_medium=readme
