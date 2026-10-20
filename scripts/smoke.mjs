#!/usr/bin/env node
// npm test: a temporary database, the demo firm, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, commands, QUESTIONS, cents, stamp, date, today } from './lib/domain.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'health-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re, msg) => { await assert.rejects(fn, re, msg); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const A = { actor: 'Test' };
const one = async (sql, p = []) => (await db.query(sql, p))[0];
const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const due = async (code, test) => one(`select * from v_due where worker_code = $1 and test_code = $2`, [code, test]);
const lead = async (code) => one(`select * from v_lead where worker_code = $1`, [code]);

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  const testsOnce = (await one('select count(*)::int as n from tests')).n;
  await seed(db);
  eq((await one('select count(*)::int as n from tests')).n, testsOnce, 'seed is idempotent (tests)');
  eq((await one('select count(*)::int as n from workers')).n, 17, 'seed is idempotent (workers)');
  eq((await one('select count(*)::int as n from assignments')).n, 17, 'seed is idempotent (assignments)');
  eq((await one('select count(*)::int as n from invoices')).n, 7, 'seed is idempotent (invoices)');
  eq((await one('select count(*)::int as n from activity')).n, 3, 'seed activity written once');
  eq((await one(`select count(*)::int as n from invoices i where total_cents <> (select coalesce(sum(price_cents), 0) from tests t where t.invoice_id = i.id) + gst_cents
    and i.ref like 'INV-H%'`)).n, 0, 'historical invoices add up to their tests');

  // Every read runs.
  for (const cmd of Object.keys(reads)) {
    const a = { employer: ['HBR'], worker: ['Grace'], test: ['T-1022'], programme: ['HBR-SMELT'] }[cmd] || [];
    ok(await call(cmd, a, {}), `read ${cmd}`);
  }
  eq(QUESTIONS.length, 10, 'ten questions');
  const ins = await call('insights');
  eq(ins.length, 10);
  ok(ins.every((q) => Array.isArray(q.rows)), 'every question returns rows');
  ok(ins[0].rows[0].code === 'W-102', 'biggest hearing shift first');

  // Parsing is strict.
  eq(cents('46.50', 'x'), 4650);
  eq(cents('$1,200', 'x'), 120000);
  assert.throws(() => cents('12.345', 'x'), /amount/); checks++;
  eq(stamp('2026-10-21 6:05', 'x'), '2026-10-21 06:05:00');
  assert.throws(() => stamp('2026-10-21 25:00', 'x'), /impossible/); checks++;
  assert.throws(() => date('2026-02-30', 'x'), /date/); checks++;

  // The rules in the database.
  const lv = await one(`select lead_removal_level(false) as r, lead_removal_level(true) as rl, lead_return_level(false) as b, lead_return_level(true) as bl,
    lead_interval(8, false)::text as a, lead_interval(15, false)::text as b2, lead_interval(22, false)::text as c, lead_interval(4, true)::text as d, lead_interval(7, true)::text as e,
    model_whs('NSW') as nsw, model_whs('VIC') as vic, model_whs('NZ') as nz`);
  eq(Number(lv.r), 30, 'r 415 removal level'); eq(Number(lv.rl), 10, 'r 415 lower removal level');
  eq(Number(lv.b), 20, 'r 417 return level'); eq(Number(lv.bl), 5, 'r 417 lower return level');
  eq(lv.a, '6 mons', 'r 407 under 10: 6 months'); eq(lv.b2, '3 mons', 'r 407 10 to 20: 3 months'); eq(lv.c, '42 days', 'r 407 20 or more: 6 weeks');
  eq(lv.d, '3 mons', 'r 407 lower under 5: 3 months'); eq(lv.e, '42 days', 'r 407 lower 5 to 10: 6 weeks');
  ok(lv.nsw && !lv.vic && !lv.nz, 'model WHS regions');

  // The demo firm says what it should.
  const attention = await call('attention');
  const has = (item, ref) => attention.some((r) => r.item === item && (!ref || r.ref === ref));
  ok(has('remove from lead work now', 'W-301'), 'blood lead at the removal level');
  ok(has('regulator not sent', 'T-1022'), 'blood lead report owed to the regulator');
  ok(has('regulator not sent', 'T-1041'), 'silica disease indicated, regulator not sent');
  ok(!has('regulator not sent', 'T-1003'), 'a noise result is not a regulator report');
  ok(has('test overdue (law)', 'W-306'), 'r 58 first audiogram past 3 months');
  ok(has('test overdue (law)', 'W-307'), 'r 58 audiogram past 2 years');
  ok(has('test overdue (law)', 'W-302'), 'r 407 lower levels, 6 weeks');
  ok(has('test overdue (law)', 'W-303'), 'r 407 10 to 20, 3 months');
  ok(has('baseline before start', 'W-305'), 'r 405 before starting lead work');
  ok(has('test overdue (programme)', 'W-501'), 'Victoria runs the practitioner programme');
  ok(has('report not obtained', 'T-1014'), 'report never obtained');
  ok(has('worker not given copy', 'T-1003'), 'worker never given a copy');
  ok(has('removed: ready to clear', 'W-304'), 'below the return level, waiting for clearance');
  ok(has('non-negative not sent to lab', 'D-03'), 'non-negative screen not at the lab');
  ok(has('lab result overdue', 'D-01'), 'lab result late');
  ok(has('employer not told', 'D-04'), 'employer not told');
  ok(has('action overdue', 'A-01'), 'follow-up overdue');
  ok(has('due soon', 'W-201'), 'due soon');
  ok(has('invoice overdue', 'INV-0101'), 'invoice overdue');
  ok(!attention.some((r) => r.ref === 'W-403'), 'a worker who has left is not recalled');
  ok(!(await db.query(`select 1 from v_due where worker_code = 'W-304' and test_code = 'blood-lead'`)).length, 'a removed worker is off the lead recall');
  eq((await due('W-306', 'audiogram')).due_on, (await one(`select (from_on + interval '3 months')::date::text as d from assignments a join workers w on w.id = a.worker_id where w.code = 'W-306'`)).d, 'r 58(2)(a) date');
  eq((await due('W-501', 'audiogram')).basis, 'practitioner', 'Victoria audiogram on the programme');
  eq((await due('W-101', 'audiogram')).basis, 'practitioner', 'NZ audiogram on the programme');
  const comp = await call('compliance');
  ok(comp.some((r) => r.kind === 'law' && /r 415\(1\)\(a\)/.test(r.rule)), 'compliance names r 415');
  ok(comp.some((r) => r.kind === 'standard'), 'compliance names the drug testing standard');
  ok(comp.every((r) => r.rule && r.cases > 0), 'every compliance row has a rule');

  // Employers, workers, groups and the programme.
  const e = await call('add-employer', [], { ...A, code: 'TWM', name: 'Taranaki Welding and Machining Ltd', region: 'nz', contact: 'Ana Rowe' });
  eq(e.currency, 'NZD', 'NZ employer bills in NZD');
  eq((await call('add-employer', [], { ...A, code: 'PBC', name: 'Pilbara Batteries Pty Ltd', region: 'WA' })).currency, 'AUD', 'AU employer bills in AUD');
  await fails(async () => call('add-employer', [], { ...A, code: 'X1', name: 'X', region: 'FIJI' }), /--region/);
  await fails(async () => call('add-employer', [], { code: 'X2', name: 'X', region: 'NZ' }), /--actor/);
  await call('add-group', [], { ...A, code: 'TWM-WELD', employer: 'TWM', name: 'Welding bay' });
  await fails(async () => call('add-programme', ['TWM-WELD'], { ...A, test: 'audiogram', hazard: 'noise' }), /--every/, 'NZ audiogram needs the practitioner interval');
  const prog = await call('add-programme', ['TWM-WELD'], { ...A, test: 'audiogram', hazard: 'noise', every: '12' });
  ok(prog.some((p) => p.test === 'audiogram' && p.every_months === '12'), 'programme recorded');
  await fails(async () => call('add-programme', ['TWM-WELD'], { ...A, test: 'spirometry', hazard: 'radon', every: '12' }), /Hazard "radon" not found/);
  await call('add-group', [], { ...A, code: 'PBC-SMELT', employer: 'PBC', name: 'Smelter' });
  const pp = await call('add-programme', ['PBC-SMELT'], { ...A, test: 'blood-lead', hazard: 'lead', statutory: true });
  ok(pp.some((p) => p.test === 'blood-lead' && p.every_months === 'set by law'), 'WA blood lead interval set by law');
  await call('add-worker', [], { ...A, code: 'W-901', employer: 'TWM', name: 'Hemi Parata', dob: '1990-01-01' });
  await fails(async () => call('assign', ['W-901'], { ...A, group: 'PBC-SMELT', from: today() }), /belongs to PBC/, 'groups stay with their employer');
  const asg = await call('assign', ['W-901'], { ...A, group: 'TWM-WELD', from: ago(5) });
  ok(asg.some((r) => r.standing === 'baseline overdue'), 'NZ baseline due before exposure');

  // r 405: blood lead before starting, again a month after starting, then r 407.
  await call('add-worker', [], { ...A, code: 'W-902', employer: 'PBC', name: 'Jo Bell', 'lower-lead': true });
  const a2 = await call('assign', ['W-902'], { ...A, group: 'PBC-SMELT', from: ago(10) });
  eq(a2[0].due_on, ago(10), 'r 405(1)(a) due on the start date');
  const r1 = await call('record-test', ['W-902'], { ...A, test: 'blood-lead', done: ago(12), value: '2', practitioner: 'Dr Y' });
  eq(r1.kind, 'baseline', 'first test is the baseline');
  eq((await due('W-902', 'blood-lead')).rule, 'WHS Regulations r 405(1)(b): 1 month after starting');
  eq((await due('W-902', 'blood-lead')).due_on, (await one(`select ($1::date + interval '1 month')::date::text as d`, [ago(10)])).d, 'r 405(1)(b) date');
  await call('record-test', ['W-902'], { ...A, test: 'blood-lead', done: today(), value: '7', practitioner: 'Dr Y' });
  eq((await due('W-902', 'blood-lead')).due_on, (await one(`select (current_date + interval '6 weeks')::date::text as d`)).d, 'r 407 lower levels 5 to 10: 6 weeks');
  const hi = await call('record-test', ['W-902'], { ...A, test: 'blood-lead', done: today(), value: '11', kind: 'follow-up' });
  ok(/removal level of 10/.test(hi.warning), 'lower removal level warned at once');
  await fails(async () => call('record-test', ['W-902'], { ...A, test: 'blood-lead', done: '2999-01-01' }), /future/);
  await fails(async () => call('record-test', ['W-902'], { ...A, test: 'dna-urine' }), /dna/);
  await fails(async () => call('record-test', ['W-901'], { ...A, test: 'chest-xray' }), /not on any/);

  // r 58: the first audiogram, then every 2 years at most.
  const au = await call('record-test', ['W-306'], { ...A, test: 'audiogram', done: today(), value: '1', practitioner: 'Dr S. Patel' });
  eq(au.kind, 'baseline');
  eq((await due('W-306', 'audiogram')).standing, 'current', 'r 58 audiogram done');
  eq((await due('W-306', 'audiogram')).due_on, (await one(`select (current_date + interval '2 years')::date::text as d`)).d, 'r 58(2)(b) two years');
  const sh = await call('record-test', ['W-901'], { ...A, test: 'audiogram', done: today(), value: '14' });
  ok(/follow-up trigger of 10 dB/.test(sh.warning), 'hearing shift warned at once');

  // Reports: obtained, worker's copy, regulator.
  const pending = (await one(`select ref from tests where worker_id = (select id from workers where code = 'W-306') order by created_at desc limit 1`)).ref;
  await fails(async () => call('worker-copy', [pending], A), /no report yet/);
  await fails(async () => call('report', [pending], { ...A, result: 'abnormal', remedial: true }), /--recommendation is required/);
  await fails(async () => call('report', [pending], { ...A, result: 'unclear' }), /--result/);
  const rep = await call('report', [pending], { ...A, result: 'normal', fit: 'fit' });
  eq(rep.regulator_needed, false, 'a noise result is not a regulator report');
  ok(/worker-copy/.test(rep.next), 'next step is the worker copy');
  await call('worker-copy', [pending], A);
  eq((await one('select standing from v_reports where ref = $1', [pending])).standing, 'done', 'report duties done');
  await fails(async () => call('regulator', ['T-1022'], A), /--reference/);
  await call('regulator', ['T-1022'], { ...A, reference: 'SWNSW-2026-12001' });
  eq((await one(`select standing from v_reports where ref = 'T-1022'`)).standing, 'done', 'regulator copy recorded');
  const silica = await call('record-test', ['W-402'], { ...A, test: 'spirometry', done: today(), value: '70' });
  const rs = await call('report', [silica.ref], { ...A, result: 'abnormal', disease: true, recommendation: 'Respiratory physician', fit: 'restricted' });
  ok(rs.regulator_needed && /regulator/.test(rs.next), 'disease indicated on statutory monitoring goes to the regulator');

  // Disclosure needs the worker's written consent.
  await fails(async () => call('disclose', ['T-1045'], { ...A, to: 'An insurer', purpose: 'consented' }), /written consent/);
  await fails(async () => call('disclose', ['T-1045'], { ...A, to: 'An insurer', purpose: 'consented', consent: today(), date: ago(1) }), /on or before/);
  await fails(async () => call('disclose', ['T-1045'], { ...A, to: 'Jack', purpose: 'worker' }), /worker-copy/);
  ok((await call('disclose', ['T-1045'], { ...A, to: 'Principal contractor', purpose: 'other-pcbu' })).length === 2, 'another PCBU with the same duty needs no consent');

  // r 415 and r 417: remove, report the removal, return only below the level and with clearance.
  const rm = await call('remove', ['W-301'], { ...A, reason: 'Blood lead 32 ug/dL' });
  ok(/removal-reported/.test(rm.next), 'removal points at the regulator');
  eq((await lead('W-301')).standing, 'removed: regulator not notified');
  ok((await call('attention')).some((r) => r.item === 'removal not reported to regulator'), 'unreported removal on the attention list');
  await call('removal-reported', [rm.ref], { ...A, reference: 'SWNSW-2026-12002' });
  eq((await lead('W-301')).standing, 'removed');
  await fails(async () => call('remove', ['W-301'], { ...A, reason: 'again' }), /unique|duplicate/i, 'one open removal at a time');
  await fails(async () => call('return', ['W-301'], { ...A, 'cleared-by': 'Dr S. Patel' }), /no blood lead result since the removal/);
  await call('record-test', ['W-301'], { ...A, test: 'blood-lead', done: today(), value: '25', kind: 'follow-up' });
  await fails(async () => call('return', ['W-301'], { ...A, 'cleared-by': 'Dr S. Patel' }), /not below the return level of 20/);
  await fails(async () => call('return', ['W-304'], A), /r 417\(3\)\(b\)/, 'no return without a doctor');
  const back = await call('return', ['W-304'], { ...A, 'cleared-by': 'Dr S. Patel' });
  eq(back.cleared_by, 'Dr S. Patel');
  eq((await lead('W-304')).standing, 'in lead work', 'back in lead work');
  ok((await due('W-304', 'blood-lead')), 'back on the lead recall');
  await fails(async () => db.query(`update removals set returned_on = current_date, cleared_by = null where ref = $1`, [rm.ref]), /check|violates/i, 'database refuses a return with no clearance');

  // Actions.
  const act = await call('add-action', ['W-901'], { ...A, what: 'Repeat audiogram', due: today() });
  await fails(async () => call('add-action', ['W-901'], { ...A, what: 'x', due: today(), test: 'T-1022' }), /not Hemi/);
  await call('close-action', [act.ref], { ...A, outcome: 'Repeat normal' });
  await fails(async () => call('close-action', [act.ref], { ...A, outcome: 'again' }), /was closed/);

  // Drug and alcohol: a non-negative screen is not a positive until the laboratory says so.
  const d1 = await call('dna', ['W-902'], { ...A, reason: 'random', sample: 'urine', screen: 'non-negative', class: 'amphetamines', at: `${today()} 07:30` });
  eq(d1.reportable_result, 'non-negative, not confirmed');
  ok(/dna-lab/.test(d1.next), 'non-negative goes to the lab');
  await fails(async () => call('dna-lab', [d1.ref], { ...A, result: 'positive' }), /not been sent/);
  await call('dna-lab', [d1.ref], { ...A, sent: today() });
  await call('dna-lab', [d1.ref], { ...A, result: 'negative' });
  eq((await one('select reportable_result from v_dna where ref = $1', [d1.ref])).reportable_result, 'negative', 'the lab decides');
  const told = await call('dna-told', [d1.ref], A);
  eq(told.result_given, 'negative');
  await fails(async () => call('dna', ['W-902'], { ...A, reason: 'random', sample: 'breath', screen: 'negative' }), /--brac/);
  await fails(async () => call('dna', ['W-902'], { ...A, reason: 'random', sample: 'breath', screen: 'negative', brac: '0.05' }), /--screen must be non-negative/);
  const br = await call('dna', ['W-902'], { ...A, reason: 'post-incident', sample: 'breath', screen: 'non-negative', brac: '0.02' });
  eq(br.reportable_result, 'alcohol detected');
  await fails(async () => call('dna-lab', [br.ref], { ...A, sent: today() }), /only a non-negative urine or oral fluid/);
  await fails(async () => call('dna', ['W-902'], { ...A, reason: 'curiosity', sample: 'urine', screen: 'negative' }), /--reason/);

  // Invoices: GST by country, never twice.
  const inv = await call('invoice', ['HBR'], A);
  ok(inv.items >= 5, 'every unbilled item');
  eq(inv.gst_cents, Math.round(inv.subtotal_cents * 0.1), '10% GST in Australia');
  eq(inv.total_cents, inv.subtotal_cents + inv.gst_cents);
  await fails(async () => call('invoice', ['HBR'], A), /Nothing to invoice/, 'never invoiced twice');
  const nz = await call('invoice', ['KJL'], A);
  eq(nz.gst_cents, Math.round(nz.subtotal_cents * 0.15), '15% GST in New Zealand');
  eq(nz.currency, 'NZD');
  await call('invoice-sent', [inv.ref], A);
  await call('invoice-paid', [inv.ref], A);
  eq((await call('invoices')).find((i) => i.ref === inv.ref).standing, 'paid');

  // A worker leaves: groups close, records stay, exit tests listed.
  const left = await call('worker-status', ['W-502'], { ...A, status: 'left', reason: 'Resigned' });
  ok(/spirometry/.test(left.exit_tests_to_offer), 'exit tests listed');
  ok(!(await db.query(`select 1 from v_due where worker_code = 'W-502'`)).length, 'left worker off the recall');
  await fails(async () => call('record-test', ['W-502'], { ...A, test: 'spirometry' }), /has left/);
  ok(await call('record-test', ['W-502'], { ...A, test: 'spirometry', kind: 'exit', value: '99' }), 'exit test still recorded');
  const ret = await call('retention', [], { worker: 'W-502' });
  ok(ret.length && ret.every((r) => r.record_years === 30 && Number(String(r.keep_until).slice(0, 4)) - Number(String(r.oldest).slice(0, 4)) >= 30), 'records kept 30 years');
  await fails(async () => db.query(`delete from tests where ref = 'T-1001'`), /kept for 30 years/, 'tests are never deleted');
  await fails(async () => db.query(`delete from workers where code = 'W-403'`), /kept for 30 years/, 'workers are never deleted');
  eq((await one(`select record_years from hazards where code = 'asbestos'`)).record_years, 40, 'asbestos records 40 years');

  // Settings and notes.
  const st = await call('set', ['recall_days', '45'], A);
  ok(st.some((s) => s.key === 'recall_days' && s.value === '45'), 'set changes a house rule');
  await fails(async () => call('set', ['nonsense', '1'], A), /Unknown setting/);
  await fails(async () => call('log', [], { ...A, note: 'x' }), /Name the/);
  ok(await call('log', ['HBR'], { ...A, note: 'Toolbox talk on lead hygiene' }), 'notes');

  // Drafts are written, never sent.
  for (const [cmd, a] of [['weekly-review', []], ['draft-recall', ['HBR']], ['draft-worker-letter', ['T-1041']], ['draft-regulator', ['T-1041']], ['draft-employer-report', ['CCS']]]) {
    const r = await call(cmd, a, {});
    ok(existsSync(path.join(process.env.OUTPUT_DIR, r.draft)), `${cmd} writes a draft`);
  }
  const reg = readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', 'regulator-T-1041.md'), 'utf8');
  ok(reg.includes('Workplace Health and Safety Queensland') && reg.includes('regulation 376'), 'regulator draft names the regulator and the rule');
  const recall = readFileSync(path.join(process.env.OUTPUT_DIR, 'drafts', `recall-HBR-${today()}.md`), 'utf8');
  ok(recall.includes('r 405(1)(a)') || recall.includes('r 58'), 'recall letter gives the rule behind each date');
  await fails(async () => call('draft-worker-letter', ['T-1014'], {}), /no report yet/);

  // Ambiguity is listed, never guessed.
  await fails(async () => call('worker', ['an']), /ambiguous/);
  await fails(async () => call('worker', ['Nobody']), /not found/);

  // Import from a Cority export: dry run, repeats skipped, a bad row stops the file.
  const ex = path.join(REPO_ROOT, 'examples', 'cority');
  const dry = await call('import', ['cority', path.join(ex, 'employees.csv')], { ...A, kind: 'workers', employer: 'RFL', 'dry-run': true });
  ok(dry.dry_run && dry.added === 3, 'dry run counts');
  eq((await one(`select count(*)::int as n from workers where external_id like 'cority:%'`)).n, 0, 'dry run keeps nothing');
  const wi = await call('import', ['cority', path.join(ex, 'employees.csv')], { ...A, kind: 'workers', employer: 'RFL' });
  const ti = await call('import', ['cority', path.join(ex, 'tests.csv')], { ...A, kind: 'tests' });
  eq(wi.added, 3); eq(ti.added, 5);
  eq((await call('import', ['cority', path.join(ex, 'tests.csv')], { ...A, kind: 'tests' })).skipped, 5, 'a second import skips repeats');
  eq((await one(`select status from workers where external_id = 'cority:E-2203'`)).status, 'left', 'terminated employees come across as left');
  eq((await one(`select dob::text as d from workers where external_id = 'cority:E-2201'`)).d, '1989-02-14', 'day-first dates read correctly');
  ok((await due('E-2201', 'spirometry')).last_on, 'imported history drives the recall');
  eq((await one(`select result from tests where external_id = 'cority:88103'`)).result, 'abnormal');
  const bad = path.join(root, 'bad.csv');
  writeFileSync(bad, 'Test ID,Employee ID,Test Type,Test Date,Result\n99001,E-2201,Audiometry,01/10/2026,Normal\n99002,E-9999,Audiometry,01/10/2026,Normal\n');
  const before = (await one('select count(*)::int as n from tests')).n;
  await fails(async () => call('import', ['cority', bad], { ...A, kind: 'tests' }), /row 3: employee "E-9999" not found.*Nothing was imported/);
  eq((await one('select count(*)::int as n from tests')).n, before, 'a bad row stops the whole file');
  await fails(async () => call('import', ['cority', bad], { ...A, kind: 'payroll' }), /--kind/);
  await fails(async () => call('import', ['medgate', bad], { ...A, kind: 'tests' }), /Usage/);

  // Export, activity, and the log cannot be rewritten.
  const exp = await call('export', [], {});
  ok(existsSync(exp.file) && exp.rows.tests > 0, 'export writes every table');
  ok((await call('activity', [], { days: '1' })).length > 30, 'activity log fills');
  await fails(async () => db.query('update activity set detail = $1', ['rewritten']), /append-only/);
  await fails(async () => db.query('delete from activity'), /append-only/);

  // Database guards beyond the CLI.
  await fails(async () => db.query(`update tests set worker_copy_on = current_date where ref = 'T-1014'`), /check|violates/i, 'no worker copy before a report');
  await fails(async () => db.query(`insert into employers (code, name, country, region, currency) values ('ZZ', 'Z', 'NZ', 'NSW', 'NZD')`), /check|violates/i);
  await fails(async () => db.query(`insert into disclosures (test_id, to_whom, purpose, disclosed_on) select id, 'x', 'consented', current_date from tests limit 1`), /check|violates/i, 'database refuses a consented disclosure with no consent');
  await fails(async () => call('nonsense'), /Unknown command/);

  // The CLI shell, views and documents.
  const env = { ...process.env };
  const cli = (a) => spawnSync(process.execPath, ['scripts/health.mjs', ...a], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  const h = cli(['--help']);
  eq(h.status, 0); ok(h.stdout.includes('record-test'), 'help lists commands');
  const j = cli(['lead', '--json']);
  eq(j.status, 0); ok(Array.isArray(JSON.parse(j.stdout)), 'json output');
  const t = cli(['attention']);
  eq(t.status, 0); ok(t.stdout.includes('regulator not sent'), 'human output');
  const u = cli(['attention', '--bogus']);
  eq(u.status, 1); ok(u.stderr.includes('Unknown option'), 'unknown option refused');
  const v = spawnSync(process.execPath, ['scripts/view.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(v.status, 0, v.stderr);
  const views = JSON.parse(readFileSync(path.join(REPO_ROOT, 'views.json'), 'utf8'));
  for (const vw of views) ok(existsSync(path.join(process.env.OUTPUT_DIR, 'views', `${vw.name}.html`)), `view ${vw.name}`);
  const page = readFileSync(path.join(process.env.OUTPUT_DIR, 'views', 'week.html'), 'utf8');
  ok(!page.includes('TODO') && page.includes('Needs attention'), 'week view rendered');
  const d = spawnSync(process.execPath, ['scripts/docs.mjs'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  eq(d.status, 0, d.stderr);
  const docs = JSON.parse(readFileSync(path.join(REPO_ROOT, 'documents.json'), 'utf8'));
  for (const doc of docs) ok(readdirSync(path.join(process.env.OUTPUT_DIR, 'docs-out', doc.name)).length > 0, `document ${doc.name}`);
  const { page: renderPage, table: renderTable } = await import('./lib/render.mjs');
  const html = renderPage({ title: 'T', subtitle: '<script>alert(1)</script>', sections: [{ title: 'S', html: renderTable([{ name: '<b>x</b>' }]) }] });
  ok(!html.includes('<script>alert') && html.includes('&lt;script&gt;') && html.includes('&lt;b&gt;'), 'HTML is escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
  const special = ['customise', 'new-view', 'view', 'documents'];
  for (const c of commands) ok(recipes.includes(c), `/${c} has a recipe`);
  for (const r of recipes) ok(commands.includes(r) || special.includes(r), `/${r} drives a real command`);
  const claude = readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  for (const r of recipes) ok(claude.includes(`/${r}\``), `CLAUDE.md routes /${r}`);
  ok(!claude.includes('TODO(author)') && !readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8').includes('TODO(author)'), 'no TODO(author) left');

  console.log(`PASS: ${checks} checks (${db.mode})`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}
