// The rules of the occupational health desk. scripts/health.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
// Dates are calendar dates (YYYY-MM-DD). The rules and their sources are in docs/compliance.md.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick, yesNo } from './csv.mjs';
import { price as money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a date (YYYY-MM-DD)`);
  return s;
}
const pastDate = (v, label) => {
  const d = v === undefined || v === true ? today() : date(v, label);
  if (d > today()) throw Error(`--${label} cannot be in the future: record it once it has happened`);
  return d;
};

// "2026-10-21 08:30" (or with a T) -> "2026-10-21 08:30:00".
export function stamp(v, label) {
  const s = String(v ?? '').trim().replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})(?::00)?$/);
  if (!m) throw Error(`--${label} must be a date and time like 2026-10-21 08:30`);
  date(m[1], label);
  const h = Number(m[2]);
  if (h > 23 || Number(m[3]) > 59) throw Error(`--${label} has an impossible time`);
  return `${m[1]} ${String(h).padStart(2, '0')}:${m[3]}:00`;
}

// "46.50" or "$46.50" -> 4650 cents. Never guesses at a blank.
export function cents(v, label) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 46.50`);
  return Math.round(parseFloat(s) * 100);
}

function num(v, label, { min = 0, max = Infinity } = {}) {
  const n = Number(v);
  if (v === undefined || v === true || String(v).trim() === '' || !Number.isFinite(n) || n < min || n > max) throw Error(`--${label} must be a number from ${min} to ${max}`);
  return n;
}
function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
const text = (v) => (v === undefined || v === true ? null : String(v).trim() || null);

export const REGIONS = ['NZ', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
export const modelWhs = (region) => ['NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].includes(region);
export const REGULATORS = {
  NZ: 'WorkSafe New Zealand', NSW: 'SafeWork NSW', VIC: 'WorkSafe Victoria', QLD: 'Workplace Health and Safety Queensland',
  WA: 'WorkSafe WA', SA: 'SafeWork SA', TAS: 'WorkSafe Tasmania', ACT: 'WorkSafe ACT', NT: 'NT WorkSafe',
};
const KINDS = ['baseline', 'periodic', 'follow-up', 'exit', 'return'];
const REASONS = ['pre-employment', 'random', 'post-incident', 'reasonable-cause', 'return-to-work'];
const SAMPLES = { urine: 'dna-urine', 'oral-fluid': 'dna-oral', breath: 'dna-breath' };

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function log(db, actor, action, ref, detail) {
  await db.query('insert into activity (actor, action, ref, detail) values ($1,$2,$3,$4)', [actor, action, ref, detail]);
}
function actorOf(flags) {
  need(flags, 'actor');
  return String(flags.actor).trim();
}
async function nextRef(db, table, prefix, width, start = 1) {
  const [r] = await db.query(`select coalesce(max(substring(ref from '[0-9]+$')::int), $2::int - 1) + 1 as n from ${table} where ref ~ $1`, [`^${prefix}[0-9]+$`, start]);
  return `${prefix}${String(r.n).padStart(width, '0')}`;
}

// Resolve one record from a code, reference, id prefix or name. Exact (case-insensitive) beats
// partial; more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => x && String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export const employer = async (db, term) => choose(await db.query('select * from employers order by code'), term, 'Employer', (r) => [r.code, r.name, r.id]);
export const worker = async (db, term) => choose(await db.query('select w.*, e.code as employer, e.region, e.country, e.currency from workers w join employers e on e.id = w.employer_id order by w.code'), term, 'Worker', (r) => [r.code, r.name, r.id]);
export const group = async (db, term) => choose(await db.query('select g.*, e.code as employer, e.region from groups g join employers e on e.id = g.employer_id order by g.code'), term, 'Group', (r) => [r.code, r.name, r.id]);
export const test = async (db, term) => choose(await db.query('select * from v_reports order by ref'), term, 'Test', (r) => [r.ref, r.id]);
const dna = async (db, term) => choose(await db.query('select * from v_dna order by ref'), term, 'Drug and alcohol test', (r) => [r.ref, r.id]);
const action = async (db, term) => choose(await db.query('select * from actions order by ref'), term, 'Action', (r) => [r.ref, r.id]);
const invoice = async (db, term) => choose(await db.query('select * from invoices order by ref'), term, 'Invoice', (r) => [r.ref, r.id]);
const testType = async (db, term) => choose(await db.query('select * from test_types order by code'), term, 'Test type', (r) => [r.code, r.name]);
const setting = async (db, key, dflt) => Number((await db.query('select value from settings where key = $1', [key]))[0]?.value ?? dflt);

function draftFile(name, body) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  writeFileSync(file, body, { mode: 0o600 });
  return path.relative(process.env.OUTPUT_DIR || REPO_ROOT, file).replace(/\\/g, '/');
}

// ------------------------------------------------------------------ reads

const ATTENTION = `
  select 0 as rank, 'remove from lead work now' as item, worker_code as ref, worker || ' (' || employer || '): blood lead ' || blood_lead || ' ug/dL on ' || last_on || ', removal level ' || removal_level as detail
    from v_lead where standing = 'remove now'
  union all
  select 1, 'regulator not sent', ref, worker || ' (' || employer || ') ' || test_code || ' ' || done_on || case when disease_indicated then ': disease indicated' else ': remedial measures recommended' end
    from v_reports where standing = 'regulator not sent'
  union all
  select 1, 'removal not reported to regulator', ref, worker || ' removed from ' || hazard_code || ' work on ' || removed_on
    from v_open_removals where regulator_on is null and hazard_code = 'lead'
  union all
  select 2, 'test overdue (law)', worker_code, worker || ' (' || employer || ') ' || test_name || ' due ' || due_on || ': ' || rule
    from v_due where basis = 'law' and standing in ('overdue', 'baseline overdue')
  union all
  select 2, 'baseline before start', worker_code, worker || ' (' || employer || ') ' || test_name || ' before ' || due_on || ': ' || rule
    from v_due where standing = 'baseline due' and test_code = 'blood-lead' and basis = 'law' and due_on <= current_date + 14
  union all
  select 2, 'non-negative not sent to lab', ref, worker || ' (' || employer || ') ' || sample || ' ' || coalesce(drug_class, '') || ', collected ' || to_char(collected_at, 'DD Mon')
    from v_dna where standing = 'non-negative not sent to lab'
  union all
  select 3, 'report not obtained', ref, worker || ' (' || employer || ') ' || test_code || ' done ' || done_on || ', ' || days_since || ' days ago'
    from v_reports where standing = 'report not obtained'
  union all
  select 3, 'worker not given copy', ref, worker || ' (' || employer || ') ' || test_code || ' report ' || report_on
    from v_reports where standing = 'worker not given copy'
  union all
  select 3, 'test overdue (programme)', worker_code, worker || ' (' || employer || ') ' || test_name || ' due ' || due_on
    from v_due where basis = 'practitioner' and standing in ('overdue', 'baseline overdue')
  union all
  select 3, 'removed: ready to clear', worker_code, worker || ': blood lead ' || blood_lead || ' below return level ' || return_level || ', needs a doctor''s clearance (r 417)'
    from v_lead where standing like 'removed: below return level%'
  union all
  select 3, 'hearing shift, no follow-up', t.ref, t.worker || ' (' || t.employer || ') shift ' || t.value || ' dB on ' || t.done_on
    from v_reports t where t.test_code = 'audiogram' and t.value >= setting_num('hearing_shift_db', 10)
      and not exists (select 1 from actions a where a.test_id = t.id)
      and t.done_on = (select max(x.done_on) from tests x where x.worker_id = t.worker_id and x.test_code = 'audiogram')
  union all
  select 3, 'action overdue', a.ref, w.name || ': ' || a.what || ' (due ' || a.due_on || ')'
    from actions a join workers w on w.id = a.worker_id where a.done_on is null and a.due_on < current_date
  union all
  select 3, 'lab result overdue', ref, worker || ' (' || employer || ') sent ' || lab_sent_on
    from v_dna where standing = 'lab result overdue'
  union all
  select 3, 'employer not told', ref, worker || ' (' || employer || ') ' || reason || ' ' || sample || ': ' || reportable_result
    from v_dna where standing = 'employer not told'
  union all
  select 4, 'due soon', worker_code, worker || ' (' || employer || ') ' || test_name || ' due ' || due_on
    from v_due where standing = 'due soon'
  union all
  select 4, 'invoice overdue', i.ref, e.code || ' ' || i.currency || ' ' || to_char(i.total_cents / 100.0, 'FM999,999,990.00') || ' due ' || i.due_on
    from invoices i join employers e on e.id = i.employer_id where i.paid_on is null and i.sent_on is not null and i.due_on < current_date
  order by 1, 2, 3`;

export const reads = {
  async attention(db) {
    return (await db.query(ATTENTION)).map(({ rank, ...r }) => r);
  },

  // The recall list: who needs which test, soonest first. Everything that is not current.
  async due(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 0, max: 730 }) : await setting(db, 'recall_days', 30);
    const params = [days];
    let where = '';
    if (f.employer) { params.push((await employer(db, f.employer)).code); where = ` and employer = $${params.length}`; }
    return db.query(`select worker_code as code, worker, employer, grp as "group", test_name as test, due_on, days_left, standing, basis, rule
      from v_due where due_on <= current_date + $1::int ${where} order by due_on, employer, worker`, params);
  },

  async programme(db, args) {
    const g = await group(db, args[0]);
    return db.query(`select gt.test_code as test, tt.name, gt.hazard_code as hazard, coalesce(gt.interval_months::text, 'set by law') as every_months, gt.statutory,
        case when gt.test_code = 'blood-lead' and model_whs($2) then 'WHS Regulations r 405 and r 407'
             when gt.test_code = 'audiogram' and model_whs($2) then 'WHS Regulations r 58 (at least every 2 years)'
             else 'Practitioner programme' end as rule
      from group_tests gt join test_types tt on tt.code = gt.test_code where gt.group_id = $1 order by gt.test_code`, [g.id, g.region]);
  },

  async employers(db) {
    return db.query(`select e.code, e.name, e.region, e.currency, e.contact_name, e.contact_email,
        (select count(*) from workers w where w.employer_id = e.id and w.status = 'active')::int as workers,
        (select count(*) from v_due d where d.employer_id = e.id and d.standing in ('overdue', 'baseline overdue'))::int as overdue_tests,
        (select coalesce(sum(total_cents), 0) from invoices i where i.employer_id = e.id and i.paid_on is null) as owing_cents
      from employers e order by e.code`);
  },

  async employer(db, args) {
    const e = await employer(db, args[0]);
    const groups = await db.query(`select g.code, g.name, (select count(*) from v_current c where c.group_id = g.id)::int as workers,
        (select string_agg(gt.test_code, ', ' order by gt.test_code) from group_tests gt where gt.group_id = g.id) as tests from groups g where g.employer_id = $1 order by g.code`, [e.id]);
    const due = await db.query(`select worker, test_name as test, due_on, standing from v_due where employer_id = $1 and standing <> 'current' order by due_on`, [e.id]);
    const reports = await db.query(`select ref, worker, test_code, done_on, standing from v_reports where employer_id = $1 and standing <> 'done' order by done_on`, [e.id]);
    return { employer: e, groups, due, reports };
  },

  async workers(db, args, f) {
    const params = [];
    let where = '';
    if (f.employer) { params.push((await employer(db, f.employer)).id); where = 'where w.employer_id = $1'; }
    return db.query(`select w.code, w.name, e.code as employer, w.role, w.status, w.started_on,
        (select string_agg(c.grp, ', ' order by c.grp) from v_current c where c.worker_id = w.id) as groups,
        (select min(d.due_on) from v_due d where d.worker_id = w.id) as next_due,
        (select count(*) from v_due d where d.worker_id = w.id and d.standing in ('overdue', 'baseline overdue'))::int as overdue
      from workers w join employers e on e.id = w.employer_id ${where} order by w.code`, params);
  },

  async worker(db, args) {
    const w = await worker(db, args[0]);
    const groups = await db.query(`select g.code, g.name, a.from_on, a.to_on from assignments a join groups g on g.id = a.group_id where a.worker_id = $1 order by a.from_on`, [w.id]);
    const due = await db.query(`select test_name as test, due_on, standing, rule from v_due where worker_id = $1 order by due_on`, [w.id]);
    const tests = await db.query(`select ref, test_code, kind, done_on, value, result, fit, standing from v_reports where worker_id = $1 order by done_on desc limit 20`, [w.id]);
    const removals = await db.query(`select ref, hazard_code, removed_on, reason, regulator_on, returned_on, cleared_by from removals where worker_id = $1 order by removed_on desc`, [w.id]);
    const actions = await db.query(`select ref, what, due_on, done_on, outcome from actions where worker_id = $1 order by due_on desc`, [w.id]);
    const drugAndAlcohol = await db.query(`select ref, reason, sample, collected_at, reportable_result, standing from v_dna where worker_id = $1 order by collected_at desc`, [w.id]);
    return { worker: w, groups, due, tests, removals, actions, drug_and_alcohol: drugAndAlcohol };
  },

  async groups(db, args, f) {
    const params = [];
    let where = '';
    if (f.employer) { params.push((await employer(db, f.employer)).id); where = 'where g.employer_id = $1'; }
    return db.query(`select g.code, g.name, e.code as employer, e.region,
        (select count(*) from v_current c where c.group_id = g.id)::int as workers,
        (select string_agg(gt.test_code || ' (' || gt.hazard_code || coalesce(', ' || gt.interval_months || 'm', '') || ')', ', ' order by gt.test_code) from group_tests gt where gt.group_id = g.id) as programme
      from groups g join employers e on e.id = g.employer_id ${where} order by g.code`, params);
  },

  async tests(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 36500 }) : 90;
    const params = [days];
    let where = '';
    if (f.worker) { params.push((await worker(db, f.worker)).id); where += ` and worker_id = $${params.length}`; }
    if (f.employer) { params.push((await employer(db, f.employer)).id); where += ` and employer_id = $${params.length}`; }
    return db.query(`select ref, worker, employer, test_code as test, kind, done_on, value, result, fit, standing
      from v_reports where done_on >= current_date - $1::int ${where} order by done_on desc, ref`, params);
  },

  async test(db, args) {
    const t = await test(db, args[0]);
    const [row] = await db.query('select practitioner, recommendation, regulator_ref, statutory, note, price_cents from tests where id = $1', [t.id]);
    const disclosures = await db.query('select to_whom, purpose, disclosed_on, consent_on from disclosures where test_id = $1 order by disclosed_on', [t.id]);
    const activity = await db.query('select at, actor, action, detail from activity where ref = $1 order by at', [t.ref]);
    return { test: { ...t, ...row }, disclosures, activity };
  },

  async reports(db, args, f) {
    return db.query(`select ref, worker, employer, region, test_code as test, done_on, result, disease_indicated as disease, remedial_recommended as remedial,
        report_on, worker_copy_on, regulator_on, regulator_needed, standing
      from v_reports where ($1::boolean is not true or standing <> 'done') order by case standing when 'regulator not sent' then 0 when 'report not obtained' then 1 when 'worker not given copy' then 2 else 3 end, done_on desc`, [f.open === true]);
  },

  async lead(db) {
    return db.query(`select worker_code as code, worker, employer, region, blood_lead, last_on, removal_level, return_level, lower_lead_levels as lower_levels, removal, standing,
        (select due_on from v_due d where d.worker_id = v_lead.worker_id and d.test_code = 'blood-lead') as next_test
      from v_lead order by case when standing = 'remove now' then 0 when standing like 'removed%' then 1 else 2 end, blood_lead desc nulls last`);
  },

  async removals(db) {
    return db.query(`select r.ref, w.code, w.name as worker, r.hazard_code as hazard, r.removed_on, r.reason, r.regulator_on, r.returned_on, r.cleared_by
      from removals r join workers w on w.id = r.worker_id order by r.removed_on desc`);
  },

  async actions(db, args, f) {
    return db.query(`select a.ref, w.name as worker, e.code as employer, a.what, a.due_on, a.done_on, a.outcome,
        case when a.done_on is not null then 'done' when a.due_on < current_date then 'overdue' else 'open' end as standing
      from actions a join workers w on w.id = a.worker_id join employers e on e.id = w.employer_id
      where ($1::boolean is not true or a.done_on is null) order by a.done_on nulls first, a.due_on`, [f.open === true]);
  },

  async 'dna-tests'(db, args, f) {
    return db.query(`select ref, worker, employer, reason, sample, to_char(collected_at, 'YYYY-MM-DD HH24:MI') as collected, screen, drug_class, lab_sent_on, lab_result, reportable_result, standing
      from v_dna where ($1::boolean is not true or standing <> 'done') order by collected_at desc`, [f.open === true]);
  },

  async disclosures(db, args) {
    const params = [];
    let where = '';
    if (args[0]) { params.push((await worker(db, args[0])).id); where = 'where t.worker_id = $1'; }
    return db.query(`select t.ref, w.name as worker, d.to_whom, d.purpose, d.disclosed_on, d.consent_on
      from disclosures d join tests t on t.id = d.test_id join workers w on w.id = t.worker_id ${where} order by d.disclosed_on desc`, params);
  },

  async retention(db, args, f) {
    const params = [];
    let where = '';
    if (f.worker) { params.push((await worker(db, f.worker)).id); where = 'where t.worker_id = $1'; }
    return db.query(`select r.worker_code as code, r.worker, r.employer, r.worker_status as status, r.hazard, r.record_years, count(*)::int as reports,
        min(r.done_on) as oldest, max(r.keep_until) as keep_until
      from v_retention r join tests t on t.ref = r.ref ${where}
      group by r.worker_code, r.worker, r.employer, r.worker_status, r.hazard, r.record_years order by r.worker_code, r.hazard`, params);
  },

  async compliance(db) {
    return db.query(`
      select 'law' as kind, 'audiogram not within 3 months of starting' as problem, 'WHS Regulations r 58(2)(a)' as rule, count(*)::int as cases, min(worker_code) as first
        from v_due where test_code = 'audiogram' and basis = 'law' and standing = 'baseline overdue' having count(*) > 0
      union all
      select 'law', 'audiogram more than 2 years old', 'WHS Regulations r 58(2)(b)', count(*)::int, min(worker_code)
        from v_due where test_code = 'audiogram' and basis = 'law' and standing = 'overdue' having count(*) > 0
      union all
      select 'law', 'blood lead test overdue', 'WHS Regulations r 405 and r 407', count(*)::int, min(worker_code)
        from v_due where test_code = 'blood-lead' and basis = 'law' and standing in ('overdue', 'baseline overdue') having count(*) > 0
      union all
      select 'law', 'blood lead at or above the removal level, worker not removed', 'WHS Regulations r 415(1)(a)', count(*)::int, min(worker_code)
        from v_lead where standing = 'remove now' having count(*) > 0
      union all
      select 'law', 'removal from lead risk work not reported to the regulator', 'WHS Regulations r 415(2)', count(*)::int, min(ref)
        from v_open_removals where hazard_code = 'lead' and regulator_on is null having count(*) > 0
      union all
      select 'law', 'report with disease indicated or remedial measures not given to the regulator', 'HSW (GRWM) Regulations 2016 reg 41 (NZ); WHS Regulations r 376 and r 413 (AU)', count(*)::int, min(ref)
        from v_reports where standing = 'regulator not sent' having count(*) > 0
      union all
      select 'law', 'report not obtained within ' || setting_num('report_days', 14) || ' days of the test', 'HSW (GRWM) Regulations 2016 reg 38 (NZ); WHS Regulations r 374 (AU): as soon as practicable', count(*)::int, min(ref)
        from v_reports where standing = 'report not obtained' having count(*) > 0
      union all
      select 'law', 'worker not given a copy within ' || setting_num('worker_copy_days', 7) || ' days of the report', 'HSW (GRWM) Regulations 2016 reg 39 (NZ); WHS Regulations r 375 (AU): as soon as practicable', count(*)::int, min(ref)
        from v_reports where standing = 'worker not given copy' having count(*) > 0
      union all
      select 'programme', 'test overdue on the practitioner''s programme', 'HSW (GRWM) Regulations 2016 reg 34 (NZ); WHS Regulations r 370 (AU); OHS Regulations 2017 (VIC)', count(*)::int, min(worker_code)
        from v_due where basis = 'practitioner' and standing in ('overdue', 'baseline overdue') having count(*) > 0
      union all
      select 'standard', 'non-negative drug screen not sent to the laboratory', 'AS/NZS 4308:2023 (urine), AS 4760:2019 (oral fluid): a non-negative screen is confirmed by a laboratory', count(*)::int, min(ref)
        from v_dna where standing = 'non-negative not sent to lab' having count(*) > 0
      union all
      select 'house', 'laboratory result more than ' || setting_num('lab_days', 3) || ' days out', 'House rule: lab_days', count(*)::int, min(ref)
        from v_dna where standing = 'lab result overdue' having count(*) > 0
      union all
      select 'house', 'employer not told a drug and alcohol result within ' || setting_num('dna_tell_days', 1) || ' day(s)', 'Contract term: dna_tell_days', count(*)::int, min(ref)
        from v_dna where standing = 'employer not told' having count(*) > 0
      union all
      select 'house', 'follow-up action overdue', 'House rule: actions are closed by their due date', count(*)::int, min(ref)
        from actions where done_on is null and due_on < current_date having count(*) > 0`);
  },

  async unbilled(db) {
    return db.query(`select employer, currency, count(*)::int as items, sum(amount_cents)::bigint as amount_cents, min(day) as oldest
      from v_unbilled group by employer, currency order by employer`);
  },

  async invoices(db) {
    return db.query(`select i.ref, e.code as employer, i.period_from, i.period_to, i.total_cents, i.currency, i.raised_on, i.due_on, i.sent_on, i.paid_on,
        case when i.paid_on is not null then 'paid' when i.sent_on is null then 'not sent' when i.due_on < current_date then 'overdue' else 'sent' end as standing
      from invoices i join employers e on e.id = i.employer_id order by i.raised_on desc, i.ref`);
  },

  async activity(db, args, f) {
    const days = f.days ? num(f.days, 'days', { min: 1, max: 3650 }) : 7;
    return db.query(`select to_char(at, 'YYYY-MM-DD HH24:MI') as at, actor, action, ref, detail from activity where at > now() - make_interval(days => $1) order by at desc`, [days]);
  },

  async settings(db) {
    return db.query('select key, value, note from settings order by key');
  },

  async insights(db) {
    return insights(db);
  },
};

// ------------------------------------------------------------------ ten questions Cority's dashboards do not answer

export const QUESTIONS = [
  ['Whose hearing has shifted most since their baseline audiogram?', `
    select * from (select distinct on (w.code) w.code, w.name as worker, e.code as employer, t.done_on as last_audiogram, t.value as shift_db,
      case when t.value >= setting_num('hearing_shift_db', 10) then 'follow up' else '' end as flag
    from tests t join workers w on w.id = t.worker_id join employers e on e.id = t.employer_id
    where t.test_code = 'audiogram' and t.value is not null and w.status = 'active'
    order by w.code, t.done_on desc) x order by shift_db desc, code`],
  ['Which exposure groups have the highest average blood lead this year, against last year?', `
    select g.code as "group", round(avg(t.value) filter (where t.done_on >= current_date - 365), 1) as avg_last_12_months,
      round(avg(t.value) filter (where t.done_on < current_date - 365 and t.done_on >= current_date - 730), 1) as avg_year_before,
      count(*) filter (where t.done_on >= current_date - 365)::int as tests
    from tests t join assignments a on a.worker_id = t.worker_id join groups g on g.id = a.group_id
    join group_tests gt on gt.group_id = g.id and gt.test_code = 'blood-lead'
    where t.test_code = 'blood-lead' and t.value is not null group by g.code order by avg_last_12_months desc nulls last`],
  ['How many workers in each exposure group are overdue or due in the next 30 days?', `
    select grp as "group", employer, count(distinct worker_id) filter (where standing in ('overdue', 'baseline overdue'))::int as overdue_workers,
      count(distinct worker_id) filter (where standing in ('due soon', 'baseline due'))::int as due_soon_workers, count(distinct worker_id)::int as workers
    from v_due group by grp, employer order by overdue_workers desc, due_soon_workers desc`],
  ['Which practitioners take longest to get a report back, over the last 12 months?', `
    select coalesce(practitioner, '(not recorded)') as practitioner, count(*)::int as reports, round(avg(report_on - done_on), 1) as avg_days_to_report, max(report_on - done_on) as slowest_days
    from tests where report_on is not null and done_on >= current_date - 365 group by practitioner order by avg_days_to_report desc`],
  ['How long do workers wait for their copy of the report, by employer?', `
    select e.code as employer, count(*)::int as reports, round(avg(t.worker_copy_on - t.report_on), 1) as avg_days_to_worker,
      count(*) filter (where t.report_on is not null and t.worker_copy_on is null)::int as not_given
    from tests t join employers e on e.id = t.employer_id where t.report_on is not null group by e.code order by not_given desc, avg_days_to_worker desc nulls last`],
  ['Who has had an abnormal result on the same test twice running?', `
    select w.code, w.name as worker, x.test_code as test, x.prev_on, x.done_on as last_on
    from (select t.*, lag(t.result) over (partition by t.worker_id, t.test_code order by t.done_on) as prev_result,
            lag(t.done_on) over (partition by t.worker_id, t.test_code order by t.done_on) as prev_on from tests t) x
    join workers w on w.id = x.worker_id where x.result = 'abnormal' and x.prev_result = 'abnormal' order by x.done_on desc`],
  ['What share of non-negative drug screens did the laboratory confirm, by drug class?', `
    select coalesce(drug_class, '(not recorded)') as drug_class, count(*)::int as non_negative, count(*) filter (where lab_result = 'positive')::int as confirmed,
      count(*) filter (where lab_result = 'negative')::int as not_confirmed, count(*) filter (where lab_result is null)::int as waiting
    from dna_tests where screen = 'non-negative' group by drug_class order by non_negative desc`],
  ['Whose lung function (FEV1) dropped 10 points or more since their previous spirometry?', `
    select w.code, w.name as worker, e.code as employer, x.prev_value, x.value as last_value, (x.prev_value - x.value) as drop_points, x.done_on
    from (select t.*, lag(t.value) over (partition by t.worker_id order by t.done_on) as prev_value from tests t where t.test_code = 'spirometry' and t.value is not null) x
    join workers w on w.id = x.worker_id join employers e on e.id = x.employer_id where x.prev_value - x.value >= 10 order by drop_points desc`],
  ['How much work is done and not yet invoiced, by employer?', `
    select employer, currency, count(*)::int as items, sum(amount_cents)::bigint as amount_cents, min(day) as oldest from v_unbilled group by employer, currency order by amount_cents desc`],
  ['For workers who have left, how many reports must still be kept, and until when?', `
    select worker_code as code, worker, employer, count(*)::int as reports, max(keep_until) as keep_until
    from v_retention where worker_status = 'left' group by worker_code, worker, employer order by keep_until desc`],
];

export async function insights(db) {
  const out = [];
  for (const [question, sql] of QUESTIONS) out.push({ question, rows: await db.query(sql) });
  return out;
}

// ------------------------------------------------------------------ writes

const writes = {
  async 'add-employer'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'name', 'region');
    const region = oneOf(String(f.region).toUpperCase(), REGIONS, 'region');
    const country = region === 'NZ' ? 'NZ' : 'AU';
    const [e] = await db.query(`insert into employers (code, name, country, region, currency, address, contact_name, contact_email, invoice_days)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning code, name, region, currency, invoice_days`,
      [String(f.code).toUpperCase(), String(f.name).trim(), country, region, country === 'NZ' ? 'NZD' : 'AUD', text(f.address), text(f.contact), text(f.email),
        f['invoice-days'] ? num(f['invoice-days'], 'invoice-days', { min: 0, max: 120 }) : 20]);
    await log(db, actor, 'add-employer', e.code, e.name);
    return e;
  },

  async 'add-worker'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'employer', 'name');
    const e = await employer(db, f.employer);
    const [w] = await db.query(`insert into workers (code, employer_id, name, dob, lower_lead_levels, role, email, phone, started_on)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning code, name, dob, role, started_on, lower_lead_levels`,
      [String(f.code).toUpperCase(), e.id, String(f.name).trim(), f.dob ? date(f.dob, 'dob') : null, f['lower-lead'] === true || yesNo(f['lower-lead']),
        text(f.role), text(f.email), text(f.phone), f.started ? date(f.started, 'started') : today()]);
    await log(db, actor, 'add-worker', w.code, `${w.name} at ${e.code}`);
    return { ...w, employer: e.code, next: `assign ${w.code} --group=<group> --from=<date they start the exposed work>` };
  },

  // A worker leaves: groups close, records stay. Lists the exit tests the programme offers.
  async 'worker-status'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'status', 'reason');
    const w = await worker(db, args[0]);
    const status = oneOf(f.status, ['active', 'left'], 'status');
    const on = pastDate(f.date, 'date');
    return tx(db, async () => {
      const exitTests = status === 'left' ? await db.query(`select distinct gt.test_code from v_current c join group_tests gt on gt.group_id = c.group_id where c.worker_id = $1 order by 1`, [w.id]) : [];
      await db.query('update workers set status = $2, left_on = $3 where id = $1', [w.id, status, status === 'left' ? on : null]);
      if (status === 'left') await db.query('update assignments set to_on = $2 where worker_id = $1 and (to_on is null or to_on > $2)', [w.id, on]);
      await log(db, actor, 'worker-status', w.code, `${status}: ${f.reason}`);
      return { worker: w.name, status, records: 'kept: health monitoring records are never deleted (30 years, 40 for asbestos)',
        exit_tests_to_offer: exitTests.map((r) => r.test_code).join(', ') || 'none' };
    });
  },

  async 'add-group'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'code', 'employer', 'name');
    const e = await employer(db, f.employer);
    const [g] = await db.query('insert into groups (code, employer_id, name, description) values ($1,$2,$3,$4) returning code, name',
      [String(f.code).toUpperCase(), e.id, String(f.name).trim(), text(f.description)]);
    await log(db, actor, 'add-group', g.code, `${g.name} at ${e.code}`);
    return { ...g, employer: e.code, next: `add-programme ${g.code} --test=<test> --hazard=<hazard> --every=<months>` };
  },

  // A test the group needs. Audiograms and blood lead in model WHS regions take their interval from
  // the law; everything else needs the practitioner's interval (--every, in months).
  async 'add-programme'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'test', 'hazard');
    const g = await group(db, args[0]);
    const tt = await testType(db, f.test);
    const [h] = await db.query('select code from hazards where code = $1', [String(f.hazard).toLowerCase()]);
    if (!h) throw Error(`Hazard "${f.hazard}" not found. Hazards: ${(await db.query('select code from hazards order by code')).map((r) => r.code).join(', ')}`);
    const lawSets = modelWhs(g.region) && ['audiogram', 'blood-lead'].includes(tt.code);
    if (!lawSets && !f.every) throw Error(`--every=<months> is required: the practitioner sets how often ${tt.name} is done here`);
    const every = f.every ? num(f.every, 'every', { min: 1, max: 60 }) : null;
    await db.query(`insert into group_tests (group_id, test_code, hazard_code, interval_months, statutory) values ($1,$2,$3,$4,$5)
      on conflict (group_id, test_code) do update set hazard_code = excluded.hazard_code, interval_months = excluded.interval_months, statutory = excluded.statutory`,
      [g.id, tt.code, h.code, every, f.statutory === true || yesNo(f.statutory)]);
    await log(db, actor, 'add-programme', g.code, `${tt.code} for ${h.code}${every ? ` every ${every} months` : ' at the interval the law sets'}`);
    return reads.programme(db, [g.code]);
  },

  async assign(db, args, f) {
    const actor = actorOf(f);
    need(f, 'group', 'from');
    const w = await worker(db, args[0]);
    const g = await group(db, f.group);
    if (g.employer_id !== w.employer_id) throw Error(`${g.code} belongs to ${g.employer}; ${w.name} works for ${w.employer}`);
    const from = date(f.from, 'from');
    await db.query('insert into assignments (worker_id, group_id, from_on) values ($1,$2,$3)', [w.id, g.id, from]);
    await log(db, actor, 'assign', w.code, `${g.code} from ${from}`);
    return db.query(`select test_name as test, due_on, standing, rule from v_due where worker_id = $1 and group_id = $2 order by due_on`, [w.id, g.id]);
  },

  async unassign(db, args, f) {
    const actor = actorOf(f);
    need(f, 'group', 'reason');
    const w = await worker(db, args[0]);
    const g = await group(db, f.group);
    const to = f.to ? date(f.to, 'to') : today();
    const rows = await db.query('update assignments set to_on = $3 where worker_id = $1 and group_id = $2 and to_on is null and from_on <= $3 returning id', [w.id, g.id, to]);
    if (!rows.length) throw Error(`${w.name} is not in ${g.code} on ${to}`);
    await log(db, actor, 'unassign', w.code, `${g.code} to ${to}: ${f.reason}`);
    return { worker: w.name, group: g.code, to };
  },

  // Record a test done. The result stays pending until the report comes back (`report`).
  async 'record-test'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'test');
    const w = await worker(db, args[0]);
    if (w.status !== 'active' && f.kind !== 'exit') throw Error(`${w.name} has left. Record an exit test with --kind=exit`);
    const tt = await testType(db, f.test);
    if (tt.code.startsWith('dna-')) throw Error('Drug and alcohol tests are recorded with `dna`');
    const prog = await db.query(`select gt.hazard_code, gt.statutory from assignments a join group_tests gt on gt.group_id = a.group_id
      where a.worker_id = $1 and gt.test_code = $2 order by a.to_on nulls first limit 1`, [w.id, tt.code]);
    const hazard = f.hazard ? String(f.hazard).toLowerCase() : prog[0]?.hazard_code;
    if (!hazard) throw Error(`${tt.name} is not on any of ${w.name}'s group programmes. Name the hazard with --hazard`);
    const done = pastDate(f.done, 'done');
    const kind = oneOf(f.kind || ((await db.query('select 1 from tests where worker_id = $1 and test_code = $2', [w.id, tt.code])).length ? 'periodic' : 'baseline'), KINDS, 'kind');
    const value = f.value === undefined ? null : num(f.value, 'value', { min: 0, max: 999 });
    const ref = await nextRef(db, 'tests', 'T-', 4, 1001);
    await db.query(`insert into tests (ref, worker_id, employer_id, test_code, hazard_code, kind, statutory, done_on, practitioner, value, price_cents, note)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [ref, w.id, w.employer_id, tt.code, hazard, kind, prog[0]?.statutory || false, done, text(f.practitioner), value,
        f.price !== undefined ? cents(f.price, 'price') : w.country === 'NZ' ? tt.price_nz_cents : tt.price_au_cents, text(f.note)]);
    await log(db, actor, 'record-test', ref, `${w.name} ${tt.code} ${kind} on ${done}${value !== null ? `, value ${value}` : ''}`);
    return { ref, worker: w.name, test: tt.code, kind, done_on: done, value, ...(await warnings(db, w, tt.code, value)), next: `report ${ref} when the practitioner's report comes back` };
  },

  // The practitioner's report is back (NZ reg 38, AU r 374): the result, any disease indicated,
  // any remedial measures recommended, and whether the worker can keep doing the work.
  async report(db, args, f) {
    const actor = actorOf(f);
    need(f, 'result');
    const t = await test(db, args[0]);
    const result = oneOf(f.result, ['normal', 'abnormal'], 'result');
    const on = pastDate(f.date, 'date');
    if (on < String(t.done_on)) throw Error(`--date cannot be before the test (${t.done_on})`);
    const disease = f.disease === true || yesNo(f.disease);
    const remedial = f.remedial === true || yesNo(f.remedial);
    if ((disease || remedial) && !text(f.recommendation)) throw Error('--recommendation is required when the report indicates disease or recommends remedial measures: copy it from the report');
    const value = f.value === undefined ? null : num(f.value, 'value', { min: 0, max: 999 });
    await db.query(`update tests set result = $2, report_on = $3, disease_indicated = $4, remedial_recommended = $5, recommendation = coalesce($6, recommendation),
      fit = coalesce($7, fit), value = coalesce($8, value) where id = $1`,
      [t.id, result, on, disease, remedial, text(f.recommendation), f.fit ? oneOf(f.fit, ['fit', 'restricted', 'unfit'], 'fit') : null, value]);
    await log(db, actor, 'report', t.ref, `${result}${disease ? ', disease indicated' : ''}${remedial ? ', remedial measures recommended' : ''}`);
    const [after] = await db.query('select * from v_reports where id = $1', [t.id]);
    const w = await worker(db, t.worker_code);
    const next = [`worker-copy ${t.ref} (give ${t.worker} a copy: NZ reg 39, AU r 375)`];
    if (after.regulator_needed) next.unshift(`regulator ${t.ref} --reference=<their reference> (send a copy to ${REGULATORS[t.region]}: NZ reg 41, AU r 376 / r 413)`);
    return { ref: t.ref, result, regulator_needed: after.regulator_needed, standing: after.standing, ...(await warnings(db, w, t.test_code, after.value)), next: next.join('; ') };
  },

  async 'worker-copy'(db, args, f) {
    const actor = actorOf(f);
    const t = await test(db, args[0]);
    if (!t.report_on) throw Error(`${t.ref} has no report yet: record it with report first`);
    const on = pastDate(f.date, 'date');
    await db.query('update tests set worker_copy_on = $2 where id = $1', [t.id, on]);
    await log(db, actor, 'worker-copy', t.ref, `${t.worker} given a copy on ${on}${f.note ? `: ${f.note}` : ''}`);
    return { ref: t.ref, worker_copy_on: on };
  },

  async regulator(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reference');
    const t = await test(db, args[0]);
    if (!t.report_on) throw Error(`${t.ref} has no report yet: record it with report first`);
    const on = pastDate(f.date, 'date');
    await db.query('update tests set regulator_on = $2, regulator_ref = $3 where id = $1', [t.id, on, String(f.reference).trim()]);
    await log(db, actor, 'regulator', t.ref, `Copy given to ${REGULATORS[t.region]} on ${on}, reference ${f.reference}`);
    return { ref: t.ref, regulator: REGULATORS[t.region], regulator_on: on, reference: f.reference };
  },

  // Who else saw a report. Anyone but another PCBU with the same duty or a person bound by professional
  // confidentiality needs the worker's written consent first (NZ reg 42(2), AU r 378(2)).
  async disclose(db, args, f) {
    const actor = actorOf(f);
    need(f, 'to', 'purpose');
    const t = await test(db, args[0]);
    const purpose = String(f.purpose);
    if (purpose === 'worker') throw Error(`Use worker-copy ${t.ref} to record the worker's copy`);
    if (purpose === 'regulator') throw Error(`Use regulator ${t.ref} to record the regulator's copy`);
    oneOf(purpose, ['other-pcbu', 'professional', 'consented'], 'purpose');
    const on = pastDate(f.date, 'date');
    if (purpose === 'consented') {
      if (!f.consent) throw Error(`${t.worker}'s written consent is needed before this report goes to ${f.to} (NZ reg 42(2), AU r 378(2)). Record the date it was signed with --consent`);
      if (date(f.consent, 'consent') > on) throw Error('--consent must be on or before the day the report was given');
    }
    await db.query('insert into disclosures (test_id, to_whom, purpose, disclosed_on, consent_on) values ($1,$2,$3,$4,$5)',
      [t.id, String(f.to).trim(), purpose, on, purpose === 'consented' ? f.consent : null]);
    await log(db, actor, 'disclose', t.ref, `To ${f.to} (${purpose}) on ${on}`);
    return reads.disclosures(db, [t.worker_code]);
  },

  // Remove a worker from lead risk work (AU r 415). Notify the regulator (r 415(2)) with removal-reported.
  async remove(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reason');
    const w = await worker(db, args[0]);
    const hazard = String(f.hazard || 'lead').toLowerCase();
    const on = pastDate(f.date, 'date');
    const [t] = await db.query(`select id, ref from tests where worker_id = $1 and hazard_code = $2 order by done_on desc limit 1`, [w.id, hazard]);
    const ref = await nextRef(db, 'removals', 'R-', 2);
    await db.query('insert into removals (ref, worker_id, hazard_code, test_id, removed_on, reason, note) values ($1,$2,$3,$4,$5,$6,$7)',
      [ref, w.id, hazard, t?.id || null, on, String(f.reason).trim(), text(f.note)]);
    await log(db, actor, 'remove', ref, `${w.name} removed from ${hazard} work on ${on}: ${f.reason}`);
    const steps = [`removal-reported ${ref} --reference=<their reference> once ${REGULATORS[w.region]} is told (r 415(2))`, `add-action ${w.code} --what="Medical examination after removal (r 416)" --due=<date>`];
    return { ref, worker: w.name, hazard, removed_on: on, next: modelWhs(w.region) && hazard === 'lead' ? steps.join('; ') : steps[1] };
  },

  async 'removal-reported'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reference');
    const [r] = await db.query('select r.*, e.region from removals r join workers w on w.id = r.worker_id join employers e on e.id = w.employer_id where upper(r.ref) = upper($1)', [String(args[0] ?? '')]);
    if (!r) throw Error(`Removal "${args[0]}" not found`);
    const on = pastDate(f.date, 'date');
    if (on < String(r.removed_on)) throw Error('--date cannot be before the removal');
    await db.query('update removals set regulator_on = $2 where id = $1', [r.id, on]);
    await log(db, actor, 'removal-reported', r.ref, `${REGULATORS[r.region]} told on ${on}, reference ${f.reference}`);
    return { ref: r.ref, regulator: REGULATORS[r.region], regulator_on: on };
  },

  // Back to lead risk work only below the return level AND with a doctor's clearance (AU r 417).
  async return(db, args, f) {
    const actor = actorOf(f);
    const w = await worker(db, args[0]);
    const hazard = String(f.hazard || 'lead').toLowerCase();
    const [r] = await db.query('select * from removals where worker_id = $1 and hazard_code = $2 and returned_on is null', [w.id, hazard]);
    if (!r) throw Error(`${w.name} has no open removal from ${hazard} work`);
    if (!text(f['cleared-by'])) throw Error(`${w.name} cannot return: a registered medical practitioner with experience in health monitoring must be satisfied the worker is fit to return (r 417(3)(b)). Name them with --cleared-by`);
    const on = pastDate(f.date, 'date');
    if (hazard === 'lead') {
      const [l] = await db.query(`select ref, value, done_on from tests where worker_id = $1 and test_code = 'blood-lead' and value is not null and done_on >= $2 order by done_on desc limit 1`, [w.id, r.removed_on]);
      const [lv] = await db.query('select lead_return_level($1) as level', [w.lower_lead_levels]);
      if (!l) throw Error(`${w.name} cannot return: no blood lead result since the removal on ${r.removed_on} (r 417(2))`);
      if (Number(l.value) >= Number(lv.level)) throw Error(`${w.name} cannot return: blood lead ${l.value} ug/dL on ${l.done_on} is not below the return level of ${Number(lv.level)} ug/dL (r 417(3)(a))`);
    }
    await db.query('update removals set returned_on = $2, cleared_by = $3 where id = $1', [r.id, on, String(f['cleared-by']).trim()]);
    await log(db, actor, 'return', r.ref, `${w.name} back to ${hazard} work on ${on}, cleared by ${f['cleared-by']}`);
    return { ref: r.ref, worker: w.name, returned_on: on, cleared_by: f['cleared-by'], next_test: (await db.query(`select due_on, rule from v_due where worker_id = $1 and hazard_code = $2`, [w.id, hazard])) };
  },

  async 'add-action'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'what', 'due');
    const w = await worker(db, args[0]);
    const t = f.test ? await test(db, f.test) : null;
    if (t && t.worker_id !== w.id) throw Error(`${t.ref} is ${t.worker}'s test, not ${w.name}'s`);
    const ref = await nextRef(db, 'actions', 'A-', 2);
    await db.query('insert into actions (ref, worker_id, test_id, what, due_on) values ($1,$2,$3,$4,$5)', [ref, w.id, t?.id || null, String(f.what).trim(), date(f.due, 'due')]);
    await log(db, actor, 'add-action', ref, `${w.name}: ${f.what} by ${f.due}`);
    return { ref, worker: w.name, what: f.what, due_on: f.due };
  },

  async 'close-action'(db, args, f) {
    const actor = actorOf(f);
    need(f, 'outcome');
    const a = await action(db, args[0]);
    if (a.done_on) throw Error(`${a.ref} was closed on ${a.done_on}`);
    const on = pastDate(f.date, 'date');
    await db.query('update actions set done_on = $2, outcome = $3 where id = $1', [a.id, on, String(f.outcome).trim()]);
    await log(db, actor, 'close-action', a.ref, String(f.outcome));
    return { ref: a.ref, done_on: on, outcome: f.outcome };
  },

  // A drug and alcohol test collected. A non-negative urine or oral fluid screen goes to the lab.
  async dna(db, args, f) {
    const actor = actorOf(f);
    need(f, 'reason', 'sample', 'screen');
    const w = await worker(db, args[0]);
    const reason = oneOf(f.reason, REASONS, 'reason');
    const sample = oneOf(f.sample, Object.keys(SAMPLES), 'sample');
    const screen = oneOf(f.screen, ['negative', 'non-negative'], 'screen');
    const at = f.at ? stamp(f.at, 'at') : new Date().toISOString().slice(0, 16).replace('T', ' ') + ':00';
    if (sample === 'breath' && f.brac === undefined) throw Error('--brac is required for a breath test (grams of alcohol per 100 mL of blood, 0.000 for none)');
    const brac = f.brac === undefined ? null : num(f.brac, 'brac', { min: 0, max: 1 });
    if (sample === 'breath' && (brac > 0) !== (screen === 'non-negative')) throw Error('--screen must be non-negative when --brac is above 0, and negative when it is 0');
    const [tt] = await db.query('select * from test_types where code = $1', [SAMPLES[sample]]);
    const ref = await nextRef(db, 'dna_tests', 'D-', 2);
    await db.query(`insert into dna_tests (ref, worker_id, employer_id, reason, sample, collected_at, collector, screen, drug_class, brac, price_cents, note)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [ref, w.id, w.employer_id, reason, sample, at, text(f.collector), screen, text(f.class), brac, w.country === 'NZ' ? tt.price_nz_cents : tt.price_au_cents, text(f.note)]);
    await log(db, actor, 'dna', ref, `${w.name} ${reason} ${sample}: ${screen}${f.class ? ` (${f.class})` : ''}`);
    return { ref, worker: w.name, screen, reportable_result: screen === 'negative' ? 'negative' : sample === 'breath' ? 'alcohol detected' : 'non-negative, not confirmed',
      next: screen === 'non-negative' && sample !== 'breath' ? `dna-lab ${ref} --sent=<date>: a non-negative screen is not a positive until the laboratory confirms it` : `dna-told ${ref} once the employer has the result` };
  },

  async 'dna-lab'(db, args, f) {
    const actor = actorOf(f);
    const d = await dna(db, args[0]);
    if (f.sent !== undefined) {
      if (d.screen !== 'non-negative' || d.sample === 'breath') throw Error(`${d.ref} is a ${d.screen} ${d.sample} test: only a non-negative urine or oral fluid screen goes to the lab`);
      const on = pastDate(f.sent, 'sent');
      await db.query('update dna_tests set lab_sent_on = $2 where id = $1', [d.id, on]);
      await log(db, actor, 'dna-lab', d.ref, `Sent to the laboratory on ${on}`);
      return { ref: d.ref, lab_sent_on: on };
    }
    need(f, 'result');
    if (!d.lab_sent_on) throw Error(`${d.ref} has not been sent to the lab: record --sent first`);
    const result = oneOf(f.result, ['negative', 'positive'], 'result');
    const on = pastDate(f.date, 'date');
    await db.query('update dna_tests set lab_result = $2, lab_result_on = $3 where id = $1', [d.id, result, on]);
    await log(db, actor, 'dna-lab', d.ref, `Laboratory result ${result} on ${on}`);
    return { ref: d.ref, lab_result: result, next: `dna-told ${d.ref} once the employer has the result` };
  },

  async 'dna-told'(db, args, f) {
    const actor = actorOf(f);
    const d = await dna(db, args[0]);
    const on = pastDate(f.date, 'date');
    await db.query('update dna_tests set employer_told_on = $2 where id = $1', [d.id, on]);
    await log(db, actor, 'dna-told', d.ref, `${d.employer} told "${d.reportable_result}" on ${on}`);
    return { ref: d.ref, told: d.employer, result_given: d.reportable_result, employer_told_on: on };
  },

  // Invoice an employer for every test done and not yet invoiced, up to --to. Never twice.
  async invoice(db, args, f) {
    const actor = actorOf(f);
    const e = await employer(db, args[0]);
    const to = f.to ? date(f.to, 'to') : today();
    return tx(db, async () => {
      const items = await db.query(`select * from v_unbilled where employer_id = $1 and day <= $2 order by day`, [e.id, to]);
      if (!items.length) throw Error(`Nothing to invoice for ${e.code} up to ${to}`);
      const gstPct = await setting(db, e.country === 'NZ' ? 'gst_nz_pct' : 'gst_au_pct', e.country === 'NZ' ? 15 : 10);
      const sub = items.reduce((s, i) => s + Number(i.amount_cents), 0);
      const gst = Math.round((sub * gstPct) / 100);
      const ref = await nextRef(db, 'invoices', 'INV-', 4, 101);
      const [inv] = await db.query(`insert into invoices (ref, employer_id, currency, period_from, period_to, subtotal_cents, gst_cents, total_cents, due_on)
        values ($1,$2,$3,$4,$5,$6,$7,$8,current_date + $9::int) returning *`, [ref, e.id, e.currency, items[0].day, to, sub, gst, sub + gst, e.invoice_days]);
      for (const i of items) {
        await db.query(`update ${i.kind === 'test' ? 'tests' : 'dna_tests'} set invoice_id = $2 where id = $1 and invoice_id is null`, [i.item_id, inv.id]);
      }
      await log(db, actor, 'invoice', ref, `${e.code}: ${items.length} items, ${money(sub + gst, e.currency)} incl GST`);
      return { ref, employer: e.code, items: items.length, subtotal_cents: sub, gst_cents: gst, total_cents: sub + gst, currency: e.currency, due_on: inv.due_on };
    });
  },

  async 'invoice-sent'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    const on = pastDate(f.date, 'date');
    await db.query('update invoices set sent_on = $2 where id = $1', [i.id, on]);
    await log(db, actor, 'invoice-sent', i.ref, on);
    return { ref: i.ref, sent_on: on };
  },

  async 'invoice-paid'(db, args, f) {
    const actor = actorOf(f);
    const i = await invoice(db, args[0]);
    const on = pastDate(f.date, 'date');
    await db.query('update invoices set paid_on = $2, sent_on = coalesce(sent_on, $2) where id = $1', [i.id, on]);
    await log(db, actor, 'invoice-paid', i.ref, on);
    return { ref: i.ref, paid_on: on };
  },

  async set(db, args, f) {
    const actor = actorOf(f);
    const [key, value] = args;
    const known = (await db.query('select key from settings')).map((r) => r.key);
    if (!known.includes(key)) throw Error(`Unknown setting "${key}". Settings: ${known.join(', ')}`);
    num(value, 'value', { min: 0, max: 365 });
    await db.query('update settings set value = $2 where key = $1', [key, String(value)]);
    await log(db, actor, 'set', key, String(value));
    return reads.settings(db);
  },

  async log(db, args, f) {
    const actor = actorOf(f);
    need(f, 'note');
    const ref = String(args[0] ?? '').trim();
    if (!ref) throw Error('Name the worker, employer, test or removal the note is about');
    await log(db, actor, 'note', ref, String(f.note));
    return { ref, note: f.note };
  },
};

// What a result means under the rules, said once, at the moment it is recorded.
async function warnings(db, w, testCode, value) {
  if (value === null || value === undefined) return {};
  if (testCode === 'blood-lead' && modelWhs(w.region)) {
    const [l] = await db.query('select lead_removal_level($1) as removal, lead_interval($2, $1)::text as next', [w.lower_lead_levels, value]);
    if (Number(value) >= Number(l.removal)) return { warning: `Blood lead ${value} ug/dL is at or above the removal level of ${Number(l.removal)} ug/dL. Remove ${w.name} from lead risk work now (r 415(1)(a)) with remove ${w.code}, and tell the regulator (r 415(2)).` };
    return { next_blood_lead: `within ${l.next} (r 407)` };
  }
  if (testCode === 'audiogram') {
    const trigger = await setting(db, 'hearing_shift_db', 10);
    if (Number(value) >= trigger) return { warning: `Hearing shift of ${value} dB is at or above the follow-up trigger of ${trigger} dB. Add a follow-up with add-action ${w.code}.` };
  }
  return {};
}

// ------------------------------------------------------------------ drafts (written to drafts/, never sent)

const drafts = {
  async 'weekly-review'(db) {
    const att = await reads.attention(db);
    const comp = await reads.compliance(db);
    const due = await reads.due(db, [], { days: '30' });
    const lead = await reads.lead(db);
    const unb = await reads.unbilled(db);
    const count = (item) => att.filter((r) => r.item === item).length;
    const lines = [`# Monday review, ${today()}`, '',
      `- Against the law: ${comp.filter((r) => r.kind === 'law').map((r) => `${r.problem} (${r.cases})`).join('; ') || 'nothing.'}`,
      `- Lead: ${lead.filter((l) => l.standing === 'remove now').map((l) => `${l.worker} at ${l.blood_lead} ug/dL, remove now`).join('; ') || 'nobody at the removal level'}; ${lead.filter((l) => String(l.standing).startsWith('removed')).length} removed.`,
      `- Recall: ${due.filter((d) => /overdue/.test(d.standing)).length} tests overdue, ${due.filter((d) => /due/.test(d.standing) && !/overdue/.test(d.standing)).length} due in the next 30 days.`,
      `- Reports: ${count('regulator not sent')} owed to the regulator, ${count('report not obtained')} not back from the practitioner, ${count('worker not given copy')} workers without their copy.`,
      `- Drug and alcohol: ${count('non-negative not sent to lab')} non-negative screens not at the lab, ${count('lab result overdue')} lab results late, ${count('employer not told')} employers not told.`,
      `- Follow-ups: ${count('action overdue')} overdue, ${count('hearing shift, no follow-up')} hearing shifts without one.`,
      `- Not invoiced: ${unb.map((u) => `${u.employer} ${money(u.amount_cents, u.currency)}`).join(', ') || 'nothing'}.`, '',
      '## Everything on the attention list', '', '| Item | Ref | Detail |', '|---|---|---|', ...att.map((r) => `| ${r.item} | ${r.ref} | ${r.detail} |`), ''];
    const file = draftFile(`weekly-review-${today()}.md`, lines.join('\n'));
    return { draft: file, attention_items: att.length, law_problems: comp.filter((r) => r.kind === 'law').length, overdue_tests: due.filter((d) => /overdue/.test(d.standing)).length };
  },

  // The letter to an employer: who to send for testing, and why each date is what it is.
  async 'draft-recall'(db, args, f) {
    const e = await employer(db, args[0]);
    const days = f.days ? num(f.days, 'days', { min: 0, max: 365 }) : 45;
    const due = await db.query(`select worker, grp, test_name, due_on, standing, rule from v_due where employer_id = $1 and due_on <= current_date + $2::int order by due_on, worker`, [e.id, days]);
    const lines = [`To: ${e.contact_name || '[CONTACT]'} <${e.contact_email || '[EMAIL]'}>`, `Subject: Health monitoring due for ${e.name}`, '',
      `Hi ${(e.contact_name || '[NAME]').split(' ')[0]},`, '',
      due.length ? `These tests are due in the next ${days} days, or are already overdue. Please book each person in.` : `Nobody at ${e.name} is due for testing in the next ${days} days.`, '',
      ...(due.length ? ['| Worker | Group | Test | Due | Why this date |', '|---|---|---|---|---|', ...due.map((d) => `| ${d.worker} | ${d.grp} | ${d.test_name} | ${d.due_on}${/overdue/.test(d.standing) ? ' (overdue)' : ''} | ${d.rule} |`), ''] : []),
      '[YOUR NAME]', ''];
    const file = draftFile(`recall-${e.code}-${today()}.md`, lines.join('\n'));
    return { draft: file, employer: e.code, tests: due.length, note: 'Draft only. Nothing is sent from here.' };
  },

  // The worker's copy of their result (NZ reg 39, AU r 375), in plain words.
  async 'draft-worker-letter'(db, args) {
    const t = await test(db, args[0]);
    if (!t.report_on) throw Error(`${t.ref} has no report yet`);
    const [x] = await db.query(`select t.recommendation, t.practitioner, w.email, w.dob, tt.name as test_name, tt.unit, e.name as employer_name
      from tests t join workers w on w.id = t.worker_id join test_types tt on tt.code = t.test_code join employers e on e.id = t.employer_id where t.id = $1`, [t.id]);
    const lines = [`To: ${t.worker} <${x.email || '[EMAIL]'}>`, `Subject: Your ${x.test_name.toLowerCase()} result from ${t.done_on}`, '',
      `Hi ${t.worker.split(' ')[0]},`, '',
      `This is your copy of the health monitoring report from your ${x.test_name.toLowerCase()} on ${t.done_on}, done by ${x.practitioner || '[PRACTITIONER]'} for ${x.employer_name}.`, '',
      `- Result: ${t.result}${t.value !== null ? ` (${t.value}${x.unit ? ` ${x.unit}` : ''})` : ''}`,
      `- Able to keep doing this work: ${t.fit || '[FROM THE REPORT]'}`,
      ...(x.recommendation ? [`- What the practitioner recommends: ${x.recommendation}`] : []), '',
      'Your report is kept as a confidential record and is not given to anyone else without your written consent, except where the law requires it (the regulator, or another business with the same duty to monitor your health).', '',
      'If you have any questions about the result, reply to this message or call us.', '', '[YOUR NAME]', ''];
    const file = draftFile(`worker-letter-${t.ref}.md`, lines.join('\n'));
    return { draft: file, test: t.ref, worker: t.worker, note: `Draft only. Once it is given, record it: worker-copy ${t.ref}` };
  },

  // The cover note when a report goes to the regulator (NZ reg 41, AU r 376 / r 413).
  async 'draft-regulator'(db, args) {
    const t = await test(db, args[0]);
    if (!t.report_on) throw Error(`${t.ref} has no report yet`);
    const [x] = await db.query(`select t.recommendation, t.practitioner, w.dob, e.name as employer_name, e.address, tt.name as test_name, tt.unit
      from tests t join workers w on w.id = t.worker_id join employers e on e.id = t.employer_id join test_types tt on tt.code = t.test_code where t.id = $1`, [t.id]);
    const rule = t.region === 'NZ' ? 'regulation 41 of the Health and Safety at Work (General Risk and Workplace Management) Regulations 2016'
      : t.test_code === 'blood-lead' ? 'regulation 413 of the Work Health and Safety Regulations' : 'regulation 376 of the Work Health and Safety Regulations';
    const lines = [`To: ${REGULATORS[t.region]}`, `Subject: Health monitoring report, ${x.employer_name}`, '',
      `Under ${rule}, ${x.employer_name} (${x.address || '[ADDRESS]'}) gives a copy of the attached health monitoring report.`, '',
      `- Worker: ${t.worker}, born ${x.dob || '[DATE OF BIRTH]'}`, `- Test: ${x.test_name} on ${t.done_on}${t.value !== null ? `, ${t.value}${x.unit ? ` ${x.unit}` : ''}` : ''}`,
      `- Practitioner: ${x.practitioner || '[PRACTITIONER]'}`, `- Report obtained: ${t.report_on}`,
      `- Why it is given: ${[t.disease_indicated && 'test results indicate the worker may have contracted a disease, illness or injury from the work', t.remedial_recommended && 'the report recommends remedial measures'].filter(Boolean).join('; ') || '[REASON]'}`,
      ...(x.recommendation ? [`- Recommendation: ${x.recommendation}`] : []), '',
      'Steps taken since: [WHAT THE BUSINESS HAS DONE].', '', '[YOUR NAME], [ROLE]', ''];
    const file = draftFile(`regulator-${t.ref}.md`, lines.join('\n'));
    return { draft: file, test: t.ref, regulator: REGULATORS[t.region], note: `Draft only. Once it is lodged, record it: regulator ${t.ref} --reference=<their reference>` };
  },

  // The employer's summary for a period: what was done, what it found, what is owed.
  async 'draft-employer-report'(db, args, f) {
    const e = await employer(db, args[0]);
    const to = f.to ? date(f.to, 'to') : today();
    const from = f.from ? date(f.from, 'from') : new Date(Date.parse(to) - 89 * 86400000).toISOString().slice(0, 10);
    const done = await db.query(`select test_code, count(*)::int as tests, count(*) filter (where result = 'abnormal')::int as abnormal, count(*) filter (where result = 'pending')::int as pending
      from v_reports where employer_id = $1 and done_on between $2 and $3 group by test_code order by test_code`, [e.id, from, to]);
    const abnormal = await db.query(`select ref, worker, test_code, done_on, fit, regulator_needed, regulator_on from v_reports where employer_id = $1 and done_on between $2 and $3 and result = 'abnormal' order by done_on`, [e.id, from, to]);
    const due = await db.query(`select worker, test_name, due_on, standing from v_due where employer_id = $1 and standing <> 'current' order by due_on`, [e.id]);
    const lines = [`# Health monitoring summary: ${e.name}`, '', `Period ${from} to ${to}. Prepared [DATE] by [YOUR NAME].`, '',
      '## Tests done', '', '| Test | Done | Abnormal | Report pending |', '|---|---|---|---|', ...done.map((d) => `| ${d.test_code} | ${d.tests} | ${d.abnormal} | ${d.pending} |`), '',
      '## Results that need action', '', abnormal.length ? '| Ref | Worker | Test | Date | Fit for the work | Regulator |\n|---|---|---|---|---|---|\n' + abnormal.map((a) => `| ${a.ref} | ${a.worker} | ${a.test_code} | ${a.done_on} | ${a.fit || ''} | ${a.regulator_needed ? (a.regulator_on ? `sent ${a.regulator_on}` : 'NOT YET SENT') : 'not required'} |`).join('\n') : 'No abnormal results this period.', '',
      '## Due next', '', due.length ? '| Worker | Test | Due | Standing |\n|---|---|---|---|\n' + due.map((d) => `| ${d.worker} | ${d.test_name} | ${d.due_on} | ${d.standing} |`).join('\n') : 'Nobody is due.', '',
      '[What we recommend for the next period.]', ''];
    const file = draftFile(`employer-report-${e.code}-${to}.md`, lines.join('\n'));
    return { draft: file, employer: e.code, from, to, abnormal: abnormal.length, note: 'Draft only. Check every line before it goes to the employer.' };
  },
};

// ------------------------------------------------------------------ import and export

// Column names a Cority export typically uses, with plain alternatives. --map overrides any of them.
const MAPS = {
  workers: { code: ['Employee ID', 'Employee Number', 'Person ID', 'Code'], name: ['Employee Name', 'Full Name', 'Name'], first: ['First Name'], last: ['Last Name'],
    dob: ['Date of Birth', 'Birth Date', 'DOB'], role: ['Job Title', 'Position', 'Occupation'], email: ['Email', 'Work Email'], started: ['Hire Date', 'Start Date'],
    group: ['SEG', 'Similar Exposure Group', 'Exposure Group'], status: ['Status', 'Employment Status'] },
  tests: { id: ['Test ID', 'Record ID', 'Encounter ID', 'ID'], worker: ['Employee ID', 'Employee Number', 'Person ID'], test: ['Test Type', 'Test', 'Procedure'],
    done: ['Test Date', 'Date', 'Encounter Date'], value: ['Result Value', 'Value'], result: ['Result', 'Interpretation', 'Outcome'], practitioner: ['Clinician', 'Practitioner', 'Provider'],
    hazard: ['Hazard', 'Agent', 'Stressor'] },
};
const TEST_NAMES = { audiogram: ['audiogram', 'audiometry', 'hearing', 'audiometric'], 'blood-lead': ['blood lead', 'lead', 'pbb'], spirometry: ['spirometry', 'lung function', 'pft'],
  'chest-xray': ['chest x-ray', 'cxr', 'chest xray', 'x-ray'], questionnaire: ['questionnaire', 'respiratory questionnaire'] };
const HAZARD_OF = { audiogram: 'noise', 'blood-lead': 'lead' };

function mapper(kind, mapFile) {
  const base = MAPS[kind];
  if (!base) throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
  const extra = mapFile ? JSON.parse(readFileSync(path.resolve(mapFile), 'utf8')) : {};
  return (row, field) => pick(row, ...(extra[field] ? [extra[field]] : []), ...(base[field] || []));
}
// "2026-10-21", "21/10/2026" (day first, as NZ and AU write it) -> 2026-10-21.
function looseDate(v, label) {
  const s = String(v || '').trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`, label);
  return date(s.slice(0, 10), label);
}
function testCodeOf(name) {
  const s = String(name || '').trim().toLowerCase();
  for (const [code, words] of Object.entries(TEST_NAMES)) if (s === code || words.some((w) => s.includes(w))) return code;
  return null;
}

async function importCority(db, args, f) {
  const actor = actorOf(f);
  const [source, file] = args;
  if (source !== 'cority') throw Error('Usage: import cority <file.csv> --kind=workers|tests --employer=<code>');
  if (!file || !existsSync(file)) throw Error(`File not found: ${file}`);
  need(f, 'kind');
  const kind = String(f.kind);
  const get = mapper(kind, f.map);
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const counts = { rows: rows.length, added: 0, skipped: 0 };
  const e = f.employer ? await employer(db, f.employer) : null;
  await db.exec('begin');
  try {
    for (const [n, r] of rows.entries()) {
      const at = `row ${n + 2}`;
      try {
        if (kind === 'workers') {
          if (!e) throw Error('--employer is required for workers');
          const ext = `cority:${get(r, 'code')}`;
          if (!get(r, 'code')) throw Error('no employee ID');
          if ((await db.query('select 1 from workers where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const name = get(r, 'name') || `${get(r, 'first')} ${get(r, 'last')}`.trim();
          if (!name) throw Error('no employee name');
          const left = /term|left|inactive/i.test(get(r, 'status'));
          const [w] = await db.query(`insert into workers (code, employer_id, name, dob, role, email, started_on, status, left_on, external_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
            [String(get(r, 'code')).toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 12), e.id, name, get(r, 'dob') ? looseDate(get(r, 'dob'), `dob (${at})`) : null,
              get(r, 'role') || null, get(r, 'email') || null, get(r, 'started') ? looseDate(get(r, 'started'), `hire date (${at})`) : null, left ? 'left' : 'active', left ? today() : null, ext]);
          if (get(r, 'group') && !left) {
            const g = await db.query('select id from groups where employer_id = $1 and (upper(code) = upper($2) or lower(name) = lower($2))', [e.id, get(r, 'group')]);
            if (g.length !== 1) throw Error(`exposure group "${get(r, 'group')}" not found at ${e.code} (add-group first)`);
            await db.query('insert into assignments (worker_id, group_id, from_on) values ($1,$2,$3)', [w.id, g[0].id, get(r, 'started') ? looseDate(get(r, 'started'), 'hire date') : today()]);
          }
        } else if (kind === 'tests') {
          const ext = `cority:${get(r, 'id')}`;
          if (!get(r, 'id')) throw Error('no test ID');
          if ((await db.query('select 1 from tests where external_id = $1', [ext])).length) { counts.skipped++; continue; }
          const wRow = await db.query('select w.id, w.employer_id from workers w where w.external_id = $1 or w.code = upper($2)', [`cority:${get(r, 'worker')}`, get(r, 'worker')]);
          if (wRow.length !== 1) throw Error(`employee "${get(r, 'worker')}" not found (import workers first)`);
          const code = testCodeOf(get(r, 'test'));
          if (!code) throw Error(`test type "${get(r, 'test')}" not recognised (audiogram, blood lead, spirometry, chest x-ray, questionnaire)`);
          const hazard = String(get(r, 'hazard') || HAZARD_OF[code] || f.hazard || '').toLowerCase();
          if (!(await db.query('select 1 from hazards where code = $1', [hazard])).length) throw Error(`hazard "${hazard}" not known: pass --hazard or add a Hazard column`);
          const result = /abn|fail|refer|positive/i.test(get(r, 'result')) ? 'abnormal' : get(r, 'result') ? 'normal' : 'pending';
          const done = looseDate(get(r, 'done'), `test date (${at})`);
          const ref = await nextRef(db, 'tests', 'T-', 4, 1001);
          const value = get(r, 'value') === '' ? null : num(get(r, 'value'), `value (${at})`, { min: 0, max: 999 });
          // History comes across as reported: the report was obtained and the worker's copy given in Cority.
          await db.query(`insert into tests (ref, worker_id, employer_id, test_code, hazard_code, kind, done_on, practitioner, value, result, report_on, worker_copy_on, external_id, note)
            values ($1,$2,$3,$4,$5,'periodic',$6,$7,$8,$9,$10,$10,$11,'Imported from Cority')`,
            [ref, wRow[0].id, wRow[0].employer_id, code, hazard, done, get(r, 'practitioner') || null, value, result, result === 'pending' ? null : done, ext]);
        } else throw Error(`--kind must be one of: ${Object.keys(MAPS).join(', ')}`);
        counts.added++;
      } catch (err) {
        throw Error(`${at}: ${err.message}. Nothing was imported.`);
      }
    }
    if (f['dry-run']) { await db.exec('rollback'); return { ...counts, dry_run: true, next: 'Run again without --dry-run to keep it' }; }
    await log(db, actor, 'import', `cority-${kind}`, `${path.basename(file)}: ${counts.added} added, ${counts.skipped} already here`);
    await db.exec('commit');
    return counts;
  } catch (err) {
    await db.exec('rollback');
    throw err;
  }
}

async function exportAll(db, args, f) {
  const tables = ['settings', 'employers', 'workers', 'hazards', 'test_types', 'groups', 'group_tests', 'assignments', 'tests', 'removals', 'actions', 'disclosures', 'dna_tests', 'invoices', 'activity'];
  const out = { exported_at: new Date().toISOString(), note: 'Confidential health records. Keep this file as securely as the database.', tables: {} };
  for (const t of tables) out.tables[t] = await db.query(`select * from ${t}`);
  const file = path.resolve(f.out || path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'exports', `health-monitoring-${today()}.json`));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 2), { mode: 0o600 });
  return { file, rows: Object.fromEntries(tables.map((t) => [t, out.tables[t].length])) };
}

const all = { ...reads, ...writes, ...drafts, import: importCority, export: exportAll };
export const commands = Object.keys(all).sort();

export async function run(db, command, args = [], flags = {}) {
  const fn = all[command];
  if (!fn) throw Error(`Unknown command "${command}". Commands: ${commands.join(', ')}`);
  return fn(db, args, flags);
}
