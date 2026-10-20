# Rules and sources

`/compliance` checks the records against these rules. Each row says where the rule comes from, what a breach looks like in the data, and where it is checked. Laws are checked as law; the practitioner's programme is checked as the programme; house rules are the business's own limits, changed with `set`, and are never reported as law.

Nothing here is legal or medical advice. It records the rules the operator has asked the system to enforce. If a rule changes, update this page and the check together (`/customise`), then run `npm test`.

## Which rules apply where

- **New Zealand:** the Health and Safety at Work (General Risk and Workplace Management) Regulations 2016, Part 2 and Part 3 (regs 31 to 42). Health monitoring is required for a substance a safe work instrument specifies; otherwise its type and frequency are what an occupational health practitioner recommends (reg 34). Every NZ test runs on the practitioner's programme here.
- **Australia, model WHS states and territories (NSW, QLD, WA, SA, TAS, ACT, NT):** the Work Health and Safety Regulations as each has made them. The regulation numbers below are the model numbering; check your own state's regulation for local differences.
- **Victoria:** the Occupational Health and Safety Regulations 2017, which number and word things differently. Victorian tests run on the practitioner's programme here; add Victoria's rules with `/customise` if you need them checked as law.

## Law

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| A worker who must wear hearing protection against noise above the exposure standard has audiometric testing within 3 months of starting the work | WHS Regulations r 58(2)(a) | Model WHS region, audiogram on the group's programme, no audiogram and more than 3 months since the worker joined the group | `v_due` (baseline overdue, basis law); `/attention`; `/compliance` |
| and in any event at least every 2 years | WHS Regulations r 58(2)(b) | Last audiogram more than 2 years ago (or the practitioner's shorter interval) | `v_due` |
| Health monitoring before a worker first starts lead risk work, and 1 month after starting | WHS Regulations r 405(1) | No blood lead on or before the start date; no second test a month after | `v_due` (r 405(1)(a), r 405(1)(b)) |
| Blood lead retested 6 months after a level under 10 ug/dL, 3 months after 10 to under 20, 6 weeks after 20 or more; for females of reproductive capacity 3 months under 5, 6 weeks from 5 to under 10 | WHS Regulations r 407(1) | Next test later than the interval from the last result | `v_due`; `lead_interval()` |
| Remove a worker from lead risk work immediately at or above 30 ug/dL (10 ug/dL for a female of reproductive capacity), or when the doctor recommends it | WHS Regulations r 415(1) | Last blood lead at or above the level with no open removal | `v_lead` (remove now); `/attention`; `record-test` warns at once |
| Notify the regulator as soon as practicable after a removal | WHS Regulations r 415(2) | Open lead removal with no regulator date | `v_open_removals`; `/attention`; `/compliance` |
| No return to lead risk work until the blood lead is below 20 ug/dL (5 ug/dL) and a registered medical practitioner is satisfied the worker is fit | WHS Regulations r 417(3) | A return with no result since removal below the level, or no doctor named | `return` refuses; database check on `removals` |
| The business obtains the health monitoring report as soon as practicable after the monitoring | HSW (GRWM) Regulations 2016 reg 38 (NZ); WHS Regulations r 374 (AU) | Result still pending more than `report_days` after the test | `v_reports` (report not obtained) |
| The report holds the worker's name and date of birth, the practitioner, the business, the date, the results, any disease indicated and any recommendation including whether the worker can continue | reg 38(2) (NZ); r 374 (AU) | Not a breach check: these are the fields `report` records and the health monitoring report document prints | `report`; `npm run docs -- health-monitoring-report` |
| The worker gets a copy as soon as practicable | reg 39 (NZ); r 375 (AU) | Report obtained, no worker copy after `worker_copy_days` | `v_reports` (worker not given copy) |
| Other businesses with the same duty get a copy | reg 40 (NZ); r 377 (AU) | Recorded with `disclose --purpose=other-pcbu`; not checked automatically | `disclose` |
| The regulator gets a copy if the report indicates disease, illness or injury from the work or recommends remedial measures; for lead, also a blood lead at the removal level | reg 41 (NZ); r 376 and r 413 (AU) | Statutory monitoring (not noise) with disease indicated, remedial measures, or a blood lead at the removal level, and no regulator date | `v_reports` (regulator not sent); `/attention` |
| Reports are confidential, kept 30 years (40 for asbestos), and not disclosed without the worker's written consent except to the regulator, other businesses with the duty, or a person bound by professional confidentiality | reg 42 (NZ); r 378 and r 444 (AU) | A disclosure marked consented with no consent date; any delete of a test, worker, removal or disclosure | database check on `disclosures`; delete triggers on `tests`, `workers`, `removals`, `disclosures`; `/retention` |
| The type and frequency of monitoring is what an occupational health practitioner recommends (or a safe work instrument sets) | reg 34 (NZ); r 370 (AU) | A test later than the practitioner's interval on the group's programme | `v_due` (basis practitioner) |

Sources, checked 20 October 2026:

- Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 (NZ), version as at 10 August 2024: https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2016/13/en/latest/ (regs 31 to 42)
- Work Health and Safety Regulation 2011 (Qld), which follows the model numbering: https://www.legislation.qld.gov.au/view/whole/html/inforce/current/sl-2011-0240 (ss 58, 368 to 378, 394, 405 to 418, 435, 444)
- Safe Work Australia, model WHS laws: https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws
- Safe Work Australia, noise duties (audiometric testing within 3 months and every 2 years): https://www.safeworkaustralia.gov.au/safety-topic/hazards/noise/whs-duties

## Standards

| Rule | Source | Breach in the data | Checked in |
|---|---|---|---|
| A non-negative on-site urine or oral fluid screen is sent to an accredited laboratory for confirmation, and is not a positive until the laboratory confirms it | AS/NZS 4308:2023 (urine), AS 4760:2019 (oral fluid) | A non-negative urine or oral fluid screen with no lab-sent date; any report of a non-negative screen as positive | `v_dna` (non-negative not sent to lab; reportable_result); `dna-lab` |

## House rules (change them with `set`)

| Setting | Default | What it checks | Why |
|---|---|---|---|
| `recall_days` | 30 | How far ahead a test shows as due soon | Time to book people in |
| `report_days` | 14 | Days after a test before a missing report is chased | "As soon as practicable" needs a number to check against; set yours |
| `worker_copy_days` | 7 | Days after the report to give the worker their copy | The same |
| `hearing_shift_db` | 10 | Average shift from baseline (dB) that needs a follow-up | A practitioner trigger, not law. Set your practitioner's |
| `lab_days` | 3 | Days after a sample goes to the lab before the result is chased | Typical laboratory turnaround |
| `dna_tell_days` | 1 | Days to tell the employer a drug and alcohol result | Most testing contracts set a window; put yours here |
| `gst_nz_pct`, `gst_au_pct` | 15, 10 | GST on invoices | GST rates |
