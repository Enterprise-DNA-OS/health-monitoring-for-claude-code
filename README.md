<h1 align="center">Health Monitoring for Claude Code</h1>

<p align="center">
  <strong>The open-source occupational health system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Cority data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=cority">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/cority?utm_source=github&utm_medium=readme&utm_campaign=cority">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#bring-your-cority-data">Instead of Cority</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Health Monitoring for Claude Code does the job you pay Cority's Occupational Health module for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Cority dashboard cannot.

Cority publishes no price. Its pricing page says what you pay depends on the solutions you use, the number and type of users and the integrations you need, with the subscription committed over an initial three-year term plus a one-time implementation project for the consultants who configure it ([cority.com/pricing](https://www.cority.com/pricing/), checked 20 October 2026). Here the database is yours, and another employer, worker or nurse costs nothing.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=cority).

It covers health monitoring in New Zealand and Australia, for an occupational health provider testing many employers' workers or an employer running its own programme: exposure groups and the tests each needs, a recall list where every date carries the rule behind it, results and the reports that must follow them, removals from lead risk work, follow-ups, workplace drug and alcohol tests, and invoices for the testing. Audiograms follow WHS Regulations r 58 (within 3 months of starting, then at least every 2 years), blood lead follows rr 405, 407, 415 and 417, and the report duties follow the NZ Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 regs 38 to 42 and their Australian twins.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no modules, no three-year term. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/health-monitoring-for-claude-code.git
cd health-monitoring-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/lead`, `/due` and `/insights` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Workers at the lead removal level, reports owed to the regulator, unreported removals, tests overdue under the law, blood lead before a start date, drug screens not at the lab, reports not back, workers without their copy, programme tests overdue, hearing shifts with no follow-up, late lab results, overdue invoices |
| `/due` | The recall list: every test due or overdue, with the rule that sets each date |
| `/lead` | Every worker in lead risk work: last blood lead against the removal and return levels, removals, next test |
| `/record-test` | Record a test done. A blood lead at the removal level or a hearing shift over the trigger is flagged at once |
| `/report` | Record the practitioner's report. Says whether the regulator must get a copy |
| `/reports` | Every test with its report duties: report obtained, worker's copy, regulator's copy |
| `/remove` and `/return` | Remove a worker from lead risk work; return them only below the return level and with a doctor's clearance |
| `/compliance` | The records checked against the rules in [docs/compliance.md](docs/compliance.md), law first, with sources |
| `/dna` | A drug or alcohol test collected. A non-negative screen goes to the lab and is never reported as a positive |
| `/disclose` | A report given to anyone else. Refuses without the worker's written consent |
| `/invoice` | Invoice an employer for testing done, GST by country, never twice |
| `/weekly-review` | The Monday review, written to `drafts/` |
| `/draft-recall` | The letter to an employer listing who to send for testing, with the rule behind each date |
| `/draft-worker-letter` | The worker's copy of their result, in plain words |
| `/draft-regulator` | The cover note when a report goes to WorkSafe New Zealand or the state regulator |
| `/insights` | The ten questions below |

The working commands: `/add-employer`, `/add-worker`, `/worker-status`, `/add-group`, `/add-programme`, `/assign`, `/unassign`, `/worker-copy`, `/regulator`, `/removal-reported`, `/add-action`, `/close-action`, `/dna-lab`, `/dna-told`, `/invoice-sent`, `/invoice-paid`, `/set`, `/log`. The reads: `/employers`, `/employer`, `/workers`, `/worker`, `/groups`, `/programme`, `/tests`, `/test`, `/removals`, `/actions`, `/dna-tests`, `/disclosures`, `/retention`, `/unbilled`, `/invoices`, `/settings`, `/activity`, and `/draft-employer-report`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 59 commands in all; [docs/cli.md](docs/cli.md) lists every option.

Names match case-insensitively. A partial name or code works when it is unique; when it is not, the command lists the candidates and stops.

## The gates

- The recall list sets each date from the rule that applies: an audiogram within 3 months of starting and at least every 2 years in model WHS states (r 58); a blood lead before lead risk work starts, a month after, then every 6 months, 3 months or 6 weeks by the last result (rr 405 and 407, with the lower levels where they apply); the practitioner's interval for everything else, and for every test in New Zealand and Victoria.
- A blood lead at or above 30 ug/dL (10 ug/dL where the lower levels apply) puts "remove now" at the top of the list (r 415). `/return` refuses until a blood lead since the removal is below 20 ug/dL (5 ug/dL) and a doctor has cleared the worker (r 417). The database refuses a return with no clearance.
- `/report` says when a copy must go to the regulator: statutory monitoring that indicates disease or recommends remedial measures, or a blood lead at the removal level (NZ reg 41, AU rr 376 and 413). Noise results do not trigger it.
- `/disclose` refuses a report going to anyone outside the law's list without the worker's written consent, and the database refuses one with no consent date (NZ reg 42(2), AU r 378(2)).
- Tests, workers, removals and disclosures cannot be deleted: health monitoring records are kept 30 years, 40 for asbestos (NZ reg 42, AU rr 378 and 444).
- `/dna` keeps a non-negative urine or oral fluid screen as "non-negative, not confirmed" until the laboratory result is recorded.
- `/invoice` bills each test once, at the employer's country price, with 15% GST in New Zealand and 10% in Australia.

The software records and checks; the practitioner and the business decide. It is not legal or medical advice, and it sends nothing.

## Bring your Cority data

Export your employees (with their similar exposure group) and test history from Cority reports as comma-separated files, then import them in that order, dry run first:

```bash
node scripts/health.mjs import cority employees.csv --kind=workers --employer=RFL --actor="Your name" --dry-run
node scripts/health.mjs import cority tests.csv --kind=tests --actor="Your name" --dry-run
```

The [switching guide](docs/replace-cority.md) covers the headings it reads, `--map` for reports with other headings, what comes across and what does not. Imports are atomic: repeat rows are skipped and one bad row stops the whole file.

## Ten questions answered from your records

`/insights` runs all ten today.

1. Whose hearing has shifted most since their baseline audiogram?
2. Which exposure groups have the highest average blood lead this year, against last year?
3. How many workers in each exposure group are overdue or due in the next 30 days?
4. Which practitioners take longest to get a report back, over the last 12 months?
5. How long do workers wait for their copy of the report, by employer?
6. Who has had an abnormal result on the same test twice running?
7. What share of non-negative drug screens did the laboratory confirm, by drug class?
8. Whose lung function (FEV1) dropped 10 points or more since their previous spirometry?
9. How much work is done and not yet invoiced, by employer?
10. For workers who have left, how many reports must still be kept, and until when?

## Your first hour: ten things to ask for

1. What needs my attention today?
2. Who at Hunter Battery is due for testing this month, and why those dates?
3. Tom's blood lead came back at 32. What do I have to do?
4. Record Sione's spirometry report: abnormal, disease indicated, refer to a respiratory physician.
5. Draft the cover note to the regulator for that report.
6. Grace's last blood lead was 17 and Dr Patel has cleared her. Can she go back?
7. Jack's oral fluid screen was non-negative for methamphetamine. What do I tell the employer?
8. Draft the recall letter for Coral Coast Stone.
9. Put our clinic name, logo and colours on the reports and invoices.
10. Add a field for the respirator fit test date on every worker through `/customise`.

## Verification

`npm test` runs every command on a temporary database with the demo firm: migrations, repeatable seed data, the r 58 audiogram dates, the r 405 and r 407 blood lead intervals with the lower levels, removal and return levels, removals reported, returns refused without a result below the level or a doctor, report duties to the worker and the regulator, noise results kept off the regulator list, disclosures refused without consent, records that cannot be deleted, drug screens kept unconfirmed until the lab, invoices to the cent with GST by country and never twice, Cority imports with dry run, repeats and rollback, drafts, export, the append-only activity log, database checks, views, documents and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Architecture

```
health-monitoring-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Health Monitoring for Claude Code for your business, migrates your Cority data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=cority)
- Read more: [enterprisedna.co/omni/instead-of/cority](https://enterprisedna.co/omni/instead-of/cority?utm_source=github&utm_medium=readme&utm_campaign=cority)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
