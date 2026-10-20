# CLI reference

`node scripts/health.mjs <command> [args] [--key=value ...]`. Every write needs `--actor="<your name>"`. Add `--json` to any command for machine-readable output. Names and codes match case-insensitively; a unique partial match works.

## actions

Every follow-up action, overdue first. --open hides closed ones.

```bash
node scripts/health.mjs actions [--open]
```

## activity

The activity log for the last 7 days (or --days=N): who did what.

```bash
node scripts/health.mjs activity [--days=N]
```

## add-action

Add a follow-up action for a worker, optionally tied to a test: a retest, a referral, a hearing protection refit.

```bash
node scripts/health.mjs add-action <worker> --what="<what>" --due=YYYY-MM-DD [--test=<ref>] --actor="<your name>"
```

## add-employer

Add an employer. The region sets the rules and the currency: NZ (NZD), or an Australian state or territory (AUD).

```bash
node scripts/health.mjs add-employer --code=<CODE> --name="<name>" --region=<NZ|NSW|VIC|QLD|WA|SA|TAS|ACT|NT> [--contact="<name>"] [--email=<email>] [--address="<address>"] [--invoice-days=N] --actor="<your name>"
```

## add-group

Add a similar exposure group to an employer: the workers who do the same work and need the same tests.

```bash
node scripts/health.mjs add-group --code=<CODE> --employer=<employer> --name="<name>" [--description="<what they do>"] --actor="<your name>"
```

## add-programme

Add a test to a group's programme, for a hazard. Audiograms and blood lead in model WHS states take their interval from the law; everything else needs the practitioner's interval (--every, months). --statutory marks monitoring the regulations require (so the regulator duties apply).

```bash
node scripts/health.mjs add-programme <group> --test=<test> --hazard=<hazard> [--every=<months>] [--statutory] --actor="<your name>"
```

## add-worker

Add a worker to an employer. --lower-lead marks a worker the lower blood lead levels apply to (female of reproductive capacity, r 407, 415, 417).

```bash
node scripts/health.mjs add-worker --code=<CODE> --employer=<employer> --name="<name>" [--dob=YYYY-MM-DD] [--role="<role>"] [--started=YYYY-MM-DD] [--lower-lead] --actor="<your name>"
```

## assign

Put a worker in an exposure group from a date. Shows the tests that start, with the rule behind each date (a blood lead before lead risk work starts, an audiogram within 3 months).

```bash
node scripts/health.mjs assign <worker> --group=<group> --from=YYYY-MM-DD --actor="<your name>"
```

## attention

Show what needs a person today: workers at the lead removal level, reports owed to the regulator, unreported removals, tests overdue under the law, blood lead before a start date, drug screens not at the lab, reports not obtained, workers without their copy, programme tests overdue, removed workers ready to clear, hearing shifts with no follow-up, overdue actions, late lab results, employers not told, tests due soon and overdue invoices.

```bash
node scripts/health.mjs attention
```

## close-action

Close a follow-up action with its outcome.

```bash
node scripts/health.mjs close-action <action ref> --outcome="<what happened>" [--date=YYYY-MM-DD] --actor="<your name>"
```

## compliance

Check the records against the rules in docs/compliance.md, law first, each with its source: audiograms, blood lead intervals, removals, regulator copies, reports, workers' copies, the practitioner's programme, drug screens and follow-ups.

```bash
node scripts/health.mjs compliance
```

## disclose

Record a report going to someone other than the worker or the regulator: another business with the same duty (other-pcbu), a person bound by professional confidentiality (professional), or anyone else with the worker's written consent (consented, --consent=date). Refuses without consent.

```bash
node scripts/health.mjs disclose <ref> --to="<who>" --purpose=<other-pcbu|professional|consented> [--consent=YYYY-MM-DD] [--date=YYYY-MM-DD] --actor="<your name>"
```

## disclosures

Who a worker's reports have been given to (other than the worker and the regulator), and the written consent behind each.

```bash
node scripts/health.mjs disclosures [<worker>]
```

## dna-lab

Record a sample sent to the laboratory (--sent=date), or the laboratory's result (--result=negative|positive).

```bash
node scripts/health.mjs dna-lab <ref> --sent=YYYY-MM-DD | --result=<negative|positive> [--date=YYYY-MM-DD] --actor="<your name>"
```

## dna-tests

Every drug and alcohol test: reason, sample, screen, lab result, the result that can be reported, and where it stands. --open hides finished ones.

```bash
node scripts/health.mjs dna-tests [--open]
```

## dna-told

Record that the employer was told a drug and alcohol result. Shows the result that can be given: a non-negative screen goes out as non-negative, not confirmed, until the lab confirms it.

```bash
node scripts/health.mjs dna-told <ref> [--date=YYYY-MM-DD] --actor="<your name>"
```

## dna

Record a drug or alcohol test collected: reason, sample (urine, oral fluid or breath), the on-site screen, the drug class, and for breath the reading (--brac).

```bash
node scripts/health.mjs dna <worker> --reason=<pre-employment|random|post-incident|reasonable-cause|return-to-work> --sample=<urine|oral-fluid|breath> --screen=<negative|non-negative> [--class="<drug class>"] [--brac=0.000] [--at="YYYY-MM-DD HH:MM"] --actor="<your name>"
```

## draft-employer-report

Draft an employer's summary for a period (default the last 90 days): tests done, abnormal results and whether the regulator has them, and who is due next. Written to drafts/, never sent.

```bash
node scripts/health.mjs draft-employer-report <employer> [--from=YYYY-MM-DD] [--to=YYYY-MM-DD]
```

## draft-recall

Draft the letter to an employer listing who to send for testing in the next 45 days (or --days=N), with the rule behind each date. Written to drafts/, never sent.

```bash
node scripts/health.mjs draft-recall <employer> [--days=N]
```

## draft-regulator

Draft the cover note when a report goes to the regulator (WorkSafe New Zealand or the state regulator), with the rule that requires it. Written to drafts/, never sent.

```bash
node scripts/health.mjs draft-regulator <ref>
```

## draft-worker-letter

Draft the worker's copy of their result in plain words, with the practitioner's recommendation and how the record is kept. Written to drafts/, never sent.

```bash
node scripts/health.mjs draft-worker-letter <ref>
```

## due

The recall list: every test due in the next 30 days (or --days=N) or overdue, with the rule that sets each date. Filter by --employer.

```bash
node scripts/health.mjs due [--employer=<employer>] [--days=N]
```

## employer

Everything about one employer: its exposure groups and their programmes, tests not current, and reports not done.

```bash
node scripts/health.mjs employer <employer>
```

## employers

Every employer: region, currency, contact, active workers, overdue tests and what they owe.

```bash
node scripts/health.mjs employers
```

## export

Export every record to one JSON file the business owns. It holds confidential health records: keep it as securely as the database.

```bash
node scripts/health.mjs export [--out=<file>]
```

## groups

Every exposure group (or --employer=<employer>): workers in it and its programme.

```bash
node scripts/health.mjs groups [--employer=<employer>]
```

## import

Bring workers (with their exposure group) or test history across from a Cority export (comma-separated). Dry run first. Import workers, then tests.

```bash
node scripts/health.mjs import cority <file.csv> --kind=<workers|tests> [--employer=<employer>] [--map=map.json] [--dry-run] --actor="<your name>"
```

## insights

The ten questions Cority's dashboards do not answer: hearing shifts, blood lead by group against last year, overdue workers by group, practitioner report times, worker copy times, repeat abnormal results, lab confirmation rates, FEV1 drops, unbilled work, and records kept for workers who have left.

```bash
node scripts/health.mjs insights
```

## invoice-paid

Record that an invoice was paid.

```bash
node scripts/health.mjs invoice-paid <invoice> [--date=YYYY-MM-DD] --actor="<your name>"
```

## invoice-sent

Record that an invoice was sent.

```bash
node scripts/health.mjs invoice-sent <invoice> [--date=YYYY-MM-DD] --actor="<your name>"
```

## invoice

Invoice an employer for every test and drug and alcohol test done and not yet invoiced, up to --to, with GST (15% NZ, 10% AU). Never twice.

```bash
node scripts/health.mjs invoice <employer> [--to=YYYY-MM-DD] --actor="<your name>"
```

## invoices

Every invoice with its standing: not sent, sent, overdue or paid.

```bash
node scripts/health.mjs invoices
```

## lead

Every worker in lead risk work: last blood lead against the removal and return levels, any removal, the standing and the next test date.

```bash
node scripts/health.mjs lead
```

## log

Add a note to the activity log about a worker, employer, test or removal.

```bash
node scripts/health.mjs log <ref> --note="<note>" --actor="<your name>"
```

## programme

One exposure group's programme: which tests, for which hazard, how often, and whether the law or the practitioner sets the interval.

```bash
node scripts/health.mjs programme <group>
```

## record-test

Record a test done: worker, test, date, practitioner and the value if there is one (dB shift, ug/dL, FEV1 %). The result stays pending until the report comes back. A blood lead at the removal level or a hearing shift over the trigger is flagged at once.

```bash
node scripts/health.mjs record-test <worker> --test=<audiogram|blood-lead|spirometry|chest-xray|questionnaire> [--done=YYYY-MM-DD] [--value=N] [--practitioner="<name>"] [--kind=<baseline|periodic|follow-up|exit|return>] --actor="<your name>"
```

## regulator

Record that a copy of the report went to the regulator, with their reference (NZ reg 41, AU r 376 and r 413).

```bash
node scripts/health.mjs regulator <ref> --reference="<their reference>" [--date=YYYY-MM-DD] --actor="<your name>"
```

## removal-reported

Record that the regulator was told about a removal from lead risk work (r 415(2)).

```bash
node scripts/health.mjs removal-reported <removal ref> --reference="<their reference>" [--date=YYYY-MM-DD] --actor="<your name>"
```

## removals

Every removal from lead risk work: when, why, when the regulator was told, and the return with the doctor who cleared it.

```bash
node scripts/health.mjs removals
```

## remove

Remove a worker from lead risk work (r 415), with the reason. Then tell the regulator (r 415(2)) and arrange the medical examination (r 416).

```bash
node scripts/health.mjs remove <worker> --reason="<reason>" [--date=YYYY-MM-DD] [--hazard=lead] --actor="<your name>"
```

## report

Record the practitioner's report: normal or abnormal, any disease indicated, any remedial measures recommended (with the recommendation), and whether the worker can keep doing the work. Says whether the regulator must get a copy.

```bash
node scripts/health.mjs report <ref> --result=<normal|abnormal> [--disease] [--remedial] [--recommendation="<as written>"] [--fit=<fit|restricted|unfit>] [--value=N] [--date=YYYY-MM-DD] --actor="<your name>"
```

## reports

Every test with its report duties: report obtained, worker's copy, regulator's copy, and where it stands. --open hides finished ones.

```bash
node scripts/health.mjs reports [--open]
```

## retention

How long each worker's health monitoring reports must be kept (30 years, 40 for asbestos), by hazard. Filter by --worker.

```bash
node scripts/health.mjs retention [--worker=<worker>]
```

## return

Return a removed worker to lead risk work. Refuses unless a blood lead since the removal is below the return level (r 417(3)(a)) and a doctor has cleared them (--cleared-by, r 417(3)(b)).

```bash
node scripts/health.mjs return <worker> --cleared-by="<doctor>" [--date=YYYY-MM-DD] --actor="<your name>"
```

## set

Change a house rule: recall_days, report_days, worker_copy_days, hearing_shift_db, lab_days, dna_tell_days, gst_nz_pct or gst_au_pct.

```bash
node scripts/health.mjs set <key> <value> --actor="<your name>"
```

## settings

The house rules and their values: recall window, report and worker-copy days, the hearing shift trigger, lab days, the employer-told window and GST.

```bash
node scripts/health.mjs settings
```

## test

One test in full: result, recommendation, report dates, who it has been disclosed to and its activity.

```bash
node scripts/health.mjs test <ref>
```

## tests

Tests done in the last 90 days (or --days=N), filtered by --worker or --employer, with the result and where the report stands.

```bash
node scripts/health.mjs tests [--worker=<worker>] [--employer=<employer>] [--days=N]
```

## unassign

Take a worker out of an exposure group from a date, with the reason.

```bash
node scripts/health.mjs unassign <worker> --group=<group> --reason="<reason>" [--to=YYYY-MM-DD] --actor="<your name>"
```

## unbilled

Tests and drug and alcohol tests done and not yet invoiced, by employer.

```bash
node scripts/health.mjs unbilled
```

## weekly-review

Write the Monday review to drafts/ from attention, compliance, the recall list, lead and unbilled work.

```bash
node scripts/health.mjs weekly-review
```

## worker-copy

Record that the worker was given a copy of their report (NZ reg 39, AU r 375).

```bash
node scripts/health.mjs worker-copy <ref> [--date=YYYY-MM-DD] --actor="<your name>"
```

## worker-status

Mark a worker as left (or active again) with the reason. Their groups close, every record stays, and the exit tests their programme offers are listed.

```bash
node scripts/health.mjs worker-status <worker> --status=<left|active> --reason="<reason>" [--date=YYYY-MM-DD] --actor="<your name>"
```

## worker

Everything about one worker: groups, tests due with the rule behind each date, recent results, removals, actions and drug and alcohol tests.

```bash
node scripts/health.mjs worker <worker>
```

## workers

Every worker (or --employer=<employer>): role, status, exposure groups, next test due and how many are overdue.

```bash
node scripts/health.mjs workers [--employer=<employer>]
```

## Outside the CLI

- `npm run view` renders `views.json` to `views/`.
- `npm run docs` renders `documents.json` to `docs-out/`.
- `npm run migrate`, `npm run seed`, `npm run demo`, `npm test`.
