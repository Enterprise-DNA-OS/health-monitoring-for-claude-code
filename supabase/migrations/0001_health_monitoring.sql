-- Health Monitoring for Claude Code: occupational health records in plain tables.
-- Employers and their workers, exposure groups and the tests each group needs, test results and
-- the report duties that follow them, removals from lead risk work, follow-up actions, drug and
-- alcohol tests, disclosures, invoices, and an append-only activity log.
-- The rules each view applies, with their sources, are in docs/compliance.md.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Regions where the model Work Health and Safety Regulations apply as numbered here.
-- Victoria runs its own OHS Regulations 2017; New Zealand runs the HSW (GRWM) Regulations 2016.
create or replace function model_whs(region text) returns boolean language sql immutable as $$
  select region in ('NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')
$$;

-- Model WHS Regulations r 415 (remove at or above) and r 417 (return below).
create or replace function lead_removal_level(lower_levels boolean) returns numeric language sql immutable as $$
  select case when lower_levels then 10 else 30 end::numeric
$$;
create or replace function lead_return_level(lower_levels boolean) returns numeric language sql immutable as $$
  select case when lower_levels then 5 else 20 end::numeric
$$;

-- Model WHS Regulations r 407: the next blood lead test, from the last result.
create or replace function lead_interval(last_value numeric, lower_levels boolean) returns interval language sql immutable as $$
  select case
    when last_value is null then interval '6 weeks'
    when lower_levels then case when last_value < 5 then interval '3 months' else interval '6 weeks' end
    when last_value < 10 then interval '6 months'
    when last_value < 20 then interval '3 months'
    else interval '6 weeks' end
$$;

-- House rules: the business's own limits, changed with `set`. Laws live in docs/compliance.md.
create table settings (
  key text primary key,
  value text not null,
  note text not null default ''
);

create table employers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (length(trim(name)) > 0),
  country text not null check (country in ('NZ', 'AU')),
  region text not null check (region in ('NZ', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  currency text not null check (currency in ('NZD', 'AUD')),
  address text,
  contact_name text,
  contact_email text,
  invoice_days int not null default 20 check (invoice_days between 0 and 120),
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((country = 'NZ') = (region = 'NZ')),
  check ((country = 'NZ' and currency = 'NZD') or (country = 'AU' and currency = 'AUD'))
);

create table workers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  employer_id uuid not null references employers(id),
  name text not null check (length(trim(name)) > 0),
  dob date,
  -- The lower blood lead levels in r 407, 415 and 417 apply ("female of reproductive capacity").
  lower_lead_levels boolean not null default false,
  role text,
  email text,
  phone text,
  started_on date,
  status text not null default 'active' check (status in ('active', 'left')),
  left_on date,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'left') = (left_on is not null))
);

-- What a worker can be exposed to, and how long the health monitoring report must be kept.
create table hazards (
  code text primary key check (code ~ '^[a-z0-9-]{2,24}$'),
  name text not null,
  record_years int not null check (record_years in (30, 40)),
  note text not null default ''
);

create table test_types (
  code text primary key check (code ~ '^[a-z0-9-]{2,24}$'),
  name text not null,
  unit text,
  price_nz_cents int not null default 0 check (price_nz_cents >= 0),
  price_au_cents int not null default 0 check (price_au_cents >= 0),
  note text not null default ''
);

-- A similar exposure group: workers who do the same work and need the same tests.
create table groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,16}$'),
  employer_id uuid not null references employers(id),
  name text not null check (length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The programme: which tests a group needs and how often. interval_months is the practitioner's
-- interval; where the law sets one (audiograms and blood lead in model WHS regions) the shorter wins.
-- statutory: the monitoring is required by regulation (AU r 368, 405, 435; NZ reg 31), so the
-- report duties to the regulator apply.
create table group_tests (
  group_id uuid not null references groups(id),
  test_code text not null references test_types(code),
  hazard_code text not null references hazards(code),
  interval_months int check (interval_months between 1 and 60),
  statutory boolean not null default false,
  primary key (group_id, test_code)
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id),
  group_id uuid not null references groups(id),
  from_on date not null,
  to_on date,
  created_at timestamptz not null default now(),
  check (to_on is null or to_on >= from_on)
);
create unique index assignments_one_open on assignments (worker_id, group_id) where to_on is null;

create table invoices (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  employer_id uuid not null references employers(id),
  currency text not null check (currency in ('NZD', 'AUD')),
  period_from date not null,
  period_to date not null,
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  gst_cents bigint not null check (gst_cents >= 0),
  total_cents bigint not null check (total_cents = subtotal_cents + gst_cents),
  raised_on date not null default current_date,
  due_on date not null,
  sent_on date,
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_to >= period_from)
);

-- One health monitoring test and its report. The report duties are dates:
-- report_on (the employer obtained the report: NZ reg 38, AU r 374), worker_copy_on (NZ reg 39, AU r 375),
-- regulator_on (NZ reg 41, AU r 376 and r 413).
create table tests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  worker_id uuid not null references workers(id),
  employer_id uuid not null references employers(id),
  test_code text not null references test_types(code),
  hazard_code text not null references hazards(code),
  kind text not null default 'periodic' check (kind in ('baseline', 'periodic', 'follow-up', 'exit', 'return')),
  statutory boolean not null default false,
  done_on date not null,
  practitioner text,
  value numeric(8,2),
  result text not null default 'pending' check (result in ('pending', 'normal', 'abnormal')),
  disease_indicated boolean not null default false,
  remedial_recommended boolean not null default false,
  recommendation text,
  fit text check (fit in ('fit', 'restricted', 'unfit')),
  report_on date,
  worker_copy_on date,
  regulator_on date,
  regulator_ref text,
  price_cents int not null default 0 check (price_cents >= 0),
  invoice_id uuid references invoices(id),
  external_id text unique,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (report_on is null or report_on >= done_on),
  check (worker_copy_on is null or (report_on is not null and worker_copy_on >= report_on)),
  check (regulator_on is null or (report_on is not null and regulator_on >= report_on)),
  check (result <> 'pending' or report_on is null)
);

-- Removal from lead risk work (AU r 415) and the return (r 417).
create table removals (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  worker_id uuid not null references workers(id),
  hazard_code text not null references hazards(code),
  test_id uuid references tests(id),
  removed_on date not null,
  reason text not null,
  regulator_on date,
  returned_on date,
  cleared_by text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (returned_on is null or (returned_on >= removed_on and cleared_by is not null))
);
create unique index removals_one_open on removals (worker_id, hazard_code) where returned_on is null;

create table actions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  worker_id uuid not null references workers(id),
  test_id uuid references tests(id),
  what text not null check (length(trim(what)) > 0),
  due_on date not null,
  done_on date,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((done_on is null) = (outcome is null))
);

-- Who a report was given to. Anyone other than the worker, the regulator, another PCBU with the
-- same duty, or a person bound by professional confidentiality needs the worker's written consent
-- (NZ reg 42(2), AU r 378(2)).
create table disclosures (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id),
  to_whom text not null check (length(trim(to_whom)) > 0),
  purpose text not null check (purpose in ('other-pcbu', 'professional', 'consented')),
  disclosed_on date not null,
  consent_on date,
  created_at timestamptz not null default now(),
  check (purpose <> 'consented' or (consent_on is not null and consent_on <= disclosed_on))
);

-- Workplace drug and alcohol tests. A non-negative on-site screen is not a positive until a
-- laboratory confirms it (AS/NZS 4308:2023 urine, AS 4760:2019 oral fluid).
create table dna_tests (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  worker_id uuid not null references workers(id),
  employer_id uuid not null references employers(id),
  reason text not null check (reason in ('pre-employment', 'random', 'post-incident', 'reasonable-cause', 'return-to-work')),
  sample text not null check (sample in ('urine', 'oral-fluid', 'breath')),
  collected_at timestamp not null,
  collector text,
  screen text not null check (screen in ('negative', 'non-negative')),
  drug_class text,
  brac numeric(5,3) check (brac is null or brac >= 0),
  lab_sent_on date,
  lab_result text check (lab_result in ('negative', 'positive')),
  lab_result_on date,
  employer_told_on date,
  price_cents int not null default 0 check (price_cents >= 0),
  invoice_id uuid references invoices(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sample <> 'breath' or lab_sent_on is null),
  check (lab_result is null or (lab_sent_on is not null and lab_result_on is not null)),
  check (screen = 'non-negative' or lab_sent_on is null)
);

create table activity (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null check (length(trim(actor)) > 0),
  action text not null,
  ref text,
  detail text not null default ''
);

create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'activity is append-only';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

-- Health monitoring reports are kept 30 years, 40 for asbestos (NZ reg 42, AU r 378 and r 444).
create or replace function records_kept() returns trigger language plpgsql as $$
begin
  raise exception 'health monitoring records are kept for 30 years (40 for asbestos): % rows are never deleted', tg_table_name;
end $$;
create trigger tests_kept before delete on tests for each row execute function records_kept();
create trigger workers_kept before delete on workers for each row execute function records_kept();
create trigger removals_kept before delete on removals for each row execute function records_kept();
create trigger disclosures_kept before delete on disclosures for each row execute function records_kept();

create trigger employers_touch before update on employers for each row execute function touch_updated_at();
create trigger workers_touch before update on workers for each row execute function touch_updated_at();
create trigger groups_touch before update on groups for each row execute function touch_updated_at();
create trigger tests_touch before update on tests for each row execute function touch_updated_at();
create trigger removals_touch before update on removals for each row execute function touch_updated_at();
create trigger actions_touch before update on actions for each row execute function touch_updated_at();
create trigger dna_touch before update on dna_tests for each row execute function touch_updated_at();
create trigger invoices_touch before update on invoices for each row execute function touch_updated_at();

-- Read-only to everyone but the owner: a shared installation adds its own grants.
do $$
declare t text;
begin
  foreach t in array array['settings','employers','workers','hazards','test_types','groups','group_tests','assignments','invoices','tests','removals','actions','disclosures','dna_tests','activity']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ views

create or replace function setting_num(k text, dflt numeric) returns numeric language sql stable as $$
  select coalesce((select value::numeric from settings where key = k), dflt)
$$;

-- Every worker in every group they are in today, or start in later.
create view v_current as
select a.id as assignment_id, w.id as worker_id, w.code as worker_code, w.name as worker, w.lower_lead_levels, w.status as worker_status,
  e.id as employer_id, e.code as employer, e.region, e.country, g.id as group_id, g.code as grp, g.name as group_name, a.from_on, a.to_on
from assignments a
join workers w on w.id = a.worker_id
join groups g on g.id = a.group_id
join employers e on e.id = g.employer_id
where (a.to_on is null or a.to_on >= current_date) and w.status = 'active';

-- Open removals: the worker is off that work until cleared.
create view v_open_removals as
select r.*, w.code as worker_code, w.name as worker from removals r join workers w on w.id = r.worker_id where r.returned_on is null;

-- The recall list: every test every worker needs, when it is due and the rule that sets the date.
create view v_due as
with base as (
  select c.*, gt.test_code, gt.interval_months, gt.statutory, tt.name as test_name, gt.hazard_code,
    (select count(*) from tests t where t.worker_id = c.worker_id and t.test_code = gt.test_code and t.done_on >= c.from_on - 90)::int as n_since,
    (select max(t.done_on) from tests t where t.worker_id = c.worker_id and t.test_code = gt.test_code) as last_on,
    (select t.value from tests t where t.worker_id = c.worker_id and t.test_code = gt.test_code and t.value is not null order by t.done_on desc limit 1) as last_value
  from v_current c
  join group_tests gt on gt.group_id = c.group_id
  join test_types tt on tt.code = gt.test_code
  where not exists (select 1 from v_open_removals r where r.worker_id = c.worker_id and r.hazard_code = gt.hazard_code)
), dated as (
  select b.*,
    case
      when b.test_code = 'blood-lead' and model_whs(b.region) then
        case when b.n_since = 0 then b.from_on
             when b.n_since = 1 and b.last_on < b.from_on + 28 then (b.from_on + interval '1 month')::date
             else least((b.last_on + lead_interval(b.last_value, b.lower_lead_levels))::date,
                        coalesce((b.last_on + make_interval(months => b.interval_months))::date, 'infinity'::date)) end
      when b.test_code = 'audiogram' and model_whs(b.region) then
        case when b.last_on is null then (b.from_on + interval '3 months')::date
             else least((b.last_on + interval '2 years')::date, (b.last_on + make_interval(months => coalesce(b.interval_months, 24)))::date) end
      else case when b.last_on is null then b.from_on
                else (b.last_on + make_interval(months => coalesce(b.interval_months, 12)))::date end
    end as due_on,
    case
      when b.test_code = 'blood-lead' and model_whs(b.region) then
        case when b.n_since = 0 then 'WHS Regulations r 405(1)(a): before starting lead risk work'
             when b.n_since = 1 and b.last_on < b.from_on + 28 then 'WHS Regulations r 405(1)(b): 1 month after starting'
             else 'WHS Regulations r 407: interval from the last blood lead level' end
      when b.test_code = 'audiogram' and model_whs(b.region) then
        case when b.last_on is null then 'WHS Regulations r 58(2)(a): within 3 months of starting'
             else 'WHS Regulations r 58(2)(b): at least every 2 years' end
      when b.last_on is null then 'Baseline before exposure: practitioner programme'
      else 'Practitioner programme: every ' || coalesce(b.interval_months, 12) || ' months'
    end as rule,
    case when (b.test_code in ('blood-lead', 'audiogram') and model_whs(b.region)) then 'law' else 'practitioner' end as basis
  from base b
)
select worker_code, worker, employer, region, grp, test_code, test_name, hazard_code, basis, rule, from_on, last_on, last_value, due_on,
  (due_on - current_date) as days_left,
  case when last_on is null and due_on < current_date then 'baseline overdue'
       when last_on is null then 'baseline due'
       when due_on < current_date then 'overdue'
       when due_on <= current_date + setting_num('recall_days', 30)::int then 'due soon'
       else 'current' end as standing,
  worker_id, employer_id, group_id, statutory
from dated;

-- Each test with its report duties and where it stands.
create view v_reports as
with t as (
  select t.*, w.code as worker_code, w.name as worker, w.lower_lead_levels, e.code as employer, e.region, tt.name as test_name,
    (t.statutory and t.hazard_code <> 'noise' and (t.disease_indicated or t.remedial_recommended
      or (t.test_code = 'blood-lead' and model_whs(e.region) and t.value >= lead_removal_level(w.lower_lead_levels)))) as regulator_needed
  from tests t join workers w on w.id = t.worker_id join employers e on e.id = t.employer_id join test_types tt on tt.code = t.test_code
)
select ref, worker_code, worker, employer, region, test_code, test_name, kind, done_on, value, result, disease_indicated, remedial_recommended, fit,
  report_on, worker_copy_on, regulator_on, regulator_needed,
  case when result = 'pending' and done_on < current_date - setting_num('report_days', 14)::int then 'report not obtained'
       when regulator_needed and report_on is not null and regulator_on is null then 'regulator not sent'
       when report_on is not null and worker_copy_on is null and report_on < current_date - setting_num('worker_copy_days', 7)::int then 'worker not given copy'
       when result = 'pending' then 'awaiting report'
       else 'done' end as standing,
  (current_date - done_on) as days_since,
  id, worker_id, employer_id, hazard_code, invoice_id
from t;

-- Every worker in lead risk work: the last blood lead level against the removal and return levels.
create view v_lead as
with lw as (
  select distinct c.worker_id, c.worker_code, c.worker, c.employer, c.region, c.lower_lead_levels
  from v_current c join group_tests gt on gt.group_id = c.group_id where gt.test_code = 'blood-lead'
  union
  select r.worker_id, w.code, w.name, e.code, e.region, w.lower_lead_levels
  from v_open_removals r join workers w on w.id = r.worker_id join employers e on e.id = w.employer_id where r.hazard_code = 'lead'
)
select lw.worker_code, lw.worker, lw.employer, lw.region, lw.lower_lead_levels,
  l.ref as last_test, l.done_on as last_on, l.value as blood_lead, lead_removal_level(lw.lower_lead_levels) as removal_level,
  lead_return_level(lw.lower_lead_levels) as return_level, r.ref as removal, r.removed_on, r.regulator_on as removal_reported_on,
  case when not model_whs(lw.region) then 'practitioner decides (no model WHS lead levels here)'
       when r.id is not null and l.value is not null and l.done_on >= r.removed_on and l.value < lead_return_level(lw.lower_lead_levels) then 'removed: below return level, needs medical clearance'
       when r.id is not null and r.regulator_on is null then 'removed: regulator not notified'
       when r.id is not null then 'removed'
       when l.value >= lead_removal_level(lw.lower_lead_levels) then 'remove now'
       when l.value is null then 'no result yet'
       else 'in lead work' end as standing,
  lw.worker_id
from lw
left join lateral (select t.ref, t.done_on, t.value from tests t where t.worker_id = lw.worker_id and t.test_code = 'blood-lead' and t.value is not null order by t.done_on desc limit 1) l on true
left join v_open_removals r on r.worker_id = lw.worker_id and r.hazard_code = 'lead';

create view v_dna as
select d.ref, w.code as worker_code, w.name as worker, e.code as employer, d.reason, d.sample, d.collected_at, d.screen, d.drug_class, d.brac,
  d.lab_sent_on, d.lab_result, d.lab_result_on, d.employer_told_on,
  case when d.screen = 'non-negative' and d.sample <> 'breath' and d.lab_sent_on is null then 'non-negative not sent to lab'
       when d.lab_sent_on is not null and d.lab_result is null and d.lab_sent_on < current_date - setting_num('lab_days', 3)::int then 'lab result overdue'
       when d.lab_sent_on is not null and d.lab_result is null then 'awaiting lab'
       when d.employer_told_on is null and d.collected_at < localtimestamp - make_interval(days => setting_num('dna_tell_days', 1)::int) then 'employer not told'
       when d.employer_told_on is null then 'tell employer'
       else 'done' end as standing,
  case when d.lab_result is not null then d.lab_result
       when d.sample = 'breath' then case when d.brac > 0 then 'alcohol detected' else 'negative' end
       when d.screen = 'negative' then 'negative'
       else 'non-negative, not confirmed' end as reportable_result,
  d.id, d.worker_id, d.employer_id
from dna_tests d join workers w on w.id = d.worker_id join employers e on e.id = d.employer_id;

-- Every report and how long it must be kept.
create view v_retention as
select t.ref, w.code as worker_code, w.name as worker, e.code as employer, t.test_code, h.code as hazard, t.done_on, h.record_years,
  (t.done_on + make_interval(years => h.record_years))::date as keep_until, w.status as worker_status
from tests t join workers w on w.id = t.worker_id join employers e on e.id = t.employer_id
join hazards h on h.code = t.hazard_code;

-- Tests and drug and alcohol tests done and not yet on an invoice.
create view v_unbilled as
select e.code as employer, e.currency, 'test' as kind, t.ref, t.test_code as item, t.done_on as day, t.price_cents as amount_cents, e.id as employer_id, t.id as item_id
from tests t join employers e on e.id = t.employer_id where t.invoice_id is null and t.price_cents > 0
union all
select e.code, e.currency, 'drug and alcohol', d.ref, d.reason || ' ' || d.sample, d.collected_at::date, d.price_cents, e.id, d.id
from dna_tests d join employers e on e.id = d.employer_id where d.invoice_id is null and d.price_cents > 0;
