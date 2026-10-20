-- Demo data: Tasman Occupational Health, a fictional occupational health nursing firm that tests
-- the workers of five employers in Hamilton, Palmerston North, Newcastle, the Gold Coast and Geelong.
-- Every name, result and event here is invented. Dates are relative to today, so the attention list
-- always has something to say: a blood lead at the removal level with nobody removed, a removed
-- worker below the return level waiting for clearance, a new starter's audiogram past three months,
-- an audiogram past two years, a report the regulator has not had, a report never obtained, a worker
-- never given their copy, a hearing shift with no follow-up, a drug screen never sent to the lab and
-- a lab result running late.
-- Safe to run twice: every row has a natural key.

insert into settings (key, value, note) values
  ('recall_days', '30', 'House rule: show a test as due soon this many days before its due date'),
  ('report_days', '14', 'House rule: days after a test before a missing report is chased'),
  ('worker_copy_days', '7', 'House rule: days after the report to give the worker their copy ("as soon as practicable")'),
  ('hearing_shift_db', '10', 'Practitioner trigger: average hearing shift from baseline (dB) that needs a follow-up'),
  ('lab_days', '3', 'House rule: days after a sample goes to the lab before the result is chased'),
  ('dna_tell_days', '1', 'Contract term: days to tell the employer a drug and alcohol result'),
  ('gst_nz_pct', '15', 'GST in New Zealand'),
  ('gst_au_pct', '10', 'GST in Australia')
on conflict (key) do nothing;

insert into hazards (code, name, record_years, note) values
  ('noise', 'Noise', 30, 'Audiometric testing: WHS Regulations r 58'),
  ('lead', 'Inorganic lead', 30, 'Lead risk work: WHS Regulations rr 394 to 418'),
  ('silica', 'Respirable crystalline silica', 30, 'Schedule 14 hazardous chemical'),
  ('isocyanates', 'Isocyanates', 30, 'Schedule 14 hazardous chemical'),
  ('wood-dust', 'Wood dust', 30, 'Practitioner programme'),
  ('asbestos', 'Asbestos', 40, 'Records kept 40 years: NZ reg 42, AU r 444')
on conflict (code) do nothing;

insert into test_types (code, name, unit, price_nz_cents, price_au_cents, note) values
  ('audiogram', 'Audiogram', 'dB shift', 4500, 5500, 'Value: average shift from baseline at 2, 3 and 4 kHz, worse ear'),
  ('blood-lead', 'Blood lead level', 'ug/dL', 8500, 9500, 'Value: micrograms of lead per decilitre of blood'),
  ('spirometry', 'Spirometry', 'FEV1 % predicted', 5500, 6500, 'Value: FEV1 as a percentage of predicted'),
  ('chest-xray', 'Chest X-ray (ILO read)', null, 12000, 14000, ''),
  ('questionnaire', 'Respiratory questionnaire', null, 2500, 3000, ''),
  ('dna-urine', 'Drug screen, urine', null, 9500, 11000, 'AS/NZS 4308:2023'),
  ('dna-oral', 'Drug screen, oral fluid', null, 8500, 9900, 'AS 4760:2019'),
  ('dna-breath', 'Breath alcohol', null, 3500, 4000, '')
on conflict (code) do nothing;

insert into employers (code, name, country, region, currency, address, contact_name, contact_email, invoice_days) values
  ('KJL', 'Kaimai Joinery Ltd', 'NZ', 'NZ', 'NZD', '12 Kahikatea Drive, Hamilton', 'Rachel Moana', 'rachel@kaimai.example.nz', 20),
  ('RFL', 'Ruahine Foundry Ltd', 'NZ', 'NZ', 'NZD', '4 Kelvin Grove Road, Palmerston North', 'Gareth Hollis', 'safety@ruahine.example.nz', 20),
  ('HBR', 'Hunter Battery Recyclers Pty Ltd', 'AU', 'NSW', 'AUD', '30 Industrial Drive, Mayfield West NSW', 'Nadia Haddad', 'whs@hunterbattery.example.com.au', 14),
  ('CCS', 'Coral Coast Stone Pty Ltd', 'AU', 'QLD', 'AUD', '8 Expansion Street, Molendinar QLD', 'Owen Pike', 'owen@coralstone.example.com.au', 14),
  ('GPP', 'Geelong Panel and Paint Pty Ltd', 'AU', 'VIC', 'AUD', '2 Fyans Street, South Geelong VIC', 'Kate Lorimer', 'kate@gpp.example.com.au', 30)
on conflict (code) do nothing;

insert into groups (code, employer_id, name, description)
select v.code, e.id, v.name, v.descr
from (values
  ('KJL-MACH', 'KJL', 'Machine shop', 'Panel saws, planers and the CNC router'),
  ('RFL-POUR', 'RFL', 'Pouring and fettling', 'Sand moulds, pouring, grinding and fettling castings'),
  ('HBR-SMELT', 'HBR', 'Breaking and smelting', 'Battery breaking, lead smelting and refining'),
  ('HBR-YARD', 'HBR', 'Yard and forklifts', 'Receiving, forklifts and the shredder'),
  ('CCS-FAB', 'CCS', 'Stone fabrication', 'Cutting, edging and polishing natural stone benchtops'),
  ('GPP-SPRAY', 'GPP', 'Spray booth', 'Two-pack spray painting and panel sanding')
) as v(code, employer, name, descr)
join employers e on e.code = v.employer
on conflict (code) do nothing;

insert into group_tests (group_id, test_code, hazard_code, interval_months, statutory)
select g.id, v.test, v.hazard, v.months, v.statutory
from (values
  ('KJL-MACH', 'audiogram', 'noise', 12, false),
  ('KJL-MACH', 'spirometry', 'wood-dust', 12, false),
  ('RFL-POUR', 'audiogram', 'noise', 12, false),
  ('RFL-POUR', 'spirometry', 'silica', 12, false),
  ('RFL-POUR', 'chest-xray', 'silica', 36, false),
  ('HBR-SMELT', 'blood-lead', 'lead', null, true),
  ('HBR-SMELT', 'audiogram', 'noise', null, true),
  ('HBR-YARD', 'audiogram', 'noise', null, true),
  ('CCS-FAB', 'spirometry', 'silica', 12, true),
  ('CCS-FAB', 'questionnaire', 'silica', 12, true),
  ('CCS-FAB', 'chest-xray', 'silica', 36, true),
  ('CCS-FAB', 'audiogram', 'noise', null, true),
  ('GPP-SPRAY', 'spirometry', 'isocyanates', 12, true),
  ('GPP-SPRAY', 'questionnaire', 'isocyanates', 12, true),
  ('GPP-SPRAY', 'audiogram', 'noise', 24, false)
) as v(grp, test, hazard, months, statutory)
join groups g on g.code = v.grp
on conflict (group_id, test_code) do nothing;

insert into workers (code, employer_id, name, dob, lower_lead_levels, role, email, started_on, status, left_on)
select v.code, e.id, v.name, v.dob::date, v.lower, v.role, v.email, current_date - v.started_ago, v.status,
  case when v.status = 'left' then current_date - 30 end
from (values
  ('W-101', 'KJL', 'Aroha Ngata', '1984-03-11', false, 'Machinist', 'aroha@example.nz', 2400, 'active'),
  ('W-102', 'KJL', 'Sam Tupou', '1991-07-02', false, 'CNC operator', 'sam.t@example.nz', 1400, 'active'),
  ('W-103', 'KJL', 'Mere Walker', '2002-01-23', false, 'Apprentice joiner', 'mere@example.nz', 10, 'active'),
  ('W-201', 'RFL', 'Hamish Doyle', '1976-09-30', false, 'Moulder', 'hamish@example.nz', 3000, 'active'),
  ('W-202', 'RFL', 'Rawiri Hohaia', '1988-12-05', false, 'Fettler', 'rawiri@example.nz', 900, 'active'),
  ('W-301', 'HBR', 'Tom Reilly', '1990-04-18', false, 'Smelter operator', 'tom.r@example.com.au', 1200, 'active'),
  ('W-302', 'HBR', 'Lucy Tran', '1996-06-09', true, 'Refinery technician', 'lucy.t@example.com.au', 600, 'active'),
  ('W-303', 'HBR', 'Daniel Okafor', '1985-02-14', false, 'Battery breaker', 'daniel.o@example.com.au', 1600, 'active'),
  ('W-304', 'HBR', 'Grace Nguyen', '1979-10-27', false, 'Smelter operator', 'grace.n@example.com.au', 2200, 'active'),
  ('W-305', 'HBR', 'Ben Fraser', '1999-08-08', false, 'Smelter operator', 'ben.f@example.com.au', -5, 'active'),
  ('W-306', 'HBR', 'Priya Sharma', '1993-05-21', false, 'Forklift driver', 'priya.s@example.com.au', 120, 'active'),
  ('W-307', 'HBR', 'Liam Chen', '1987-11-30', false, 'Furnace operator', 'liam.c@example.com.au', 2600, 'active'),
  ('W-401', 'CCS', 'Sione Taufa', '1980-01-15', false, 'Stonemason', 'sione@example.com.au', 4000, 'active'),
  ('W-402', 'CCS', 'Jack Morrison', '1994-03-03', false, 'CNC saw operator', 'jack.m@example.com.au', 1300, 'active'),
  ('W-403', 'CCS', 'Ella Brooks', '1990-09-12', false, 'Polisher', 'ella.b@example.com.au', 1500, 'left'),
  ('W-501', 'GPP', 'Owen Lacey', '1983-04-04', false, 'Spray painter', 'owen.l@example.com.au', 2800, 'active'),
  ('W-502', 'GPP', 'Kiri Moana', '1997-12-19', false, 'Panel beater', 'kiri.m@example.com.au', 700, 'active')
) as v(code, employer, name, dob, lower, role, email, started_ago, status)
join employers e on e.code = v.employer
on conflict (code) do nothing;

insert into assignments (worker_id, group_id, from_on, to_on)
select w.id, g.id, current_date - v.from_ago, case when v.ended then current_date - 30 end
from (values
  ('W-101', 'KJL-MACH', 2400, false), ('W-102', 'KJL-MACH', 1400, false), ('W-103', 'KJL-MACH', 10, false),
  ('W-201', 'RFL-POUR', 3000, false), ('W-202', 'RFL-POUR', 900, false),
  ('W-301', 'HBR-SMELT', 1200, false), ('W-302', 'HBR-SMELT', 600, false), ('W-303', 'HBR-SMELT', 1600, false),
  ('W-304', 'HBR-SMELT', 2200, false), ('W-305', 'HBR-SMELT', -5, false), ('W-306', 'HBR-YARD', 120, false),
  ('W-307', 'HBR-SMELT', 2600, false),
  ('W-401', 'CCS-FAB', 4000, false), ('W-402', 'CCS-FAB', 1300, false), ('W-403', 'CCS-FAB', 1500, true),
  ('W-501', 'GPP-SPRAY', 2800, false), ('W-502', 'GPP-SPRAY', 700, false)
) as v(worker, grp, from_ago, ended)
join workers w on w.code = v.worker join groups g on g.code = v.grp
where not exists (select 1 from assignments a where a.worker_id = w.id and a.group_id = g.id);

insert into invoices (ref, employer_id, currency, period_from, period_to, subtotal_cents, gst_cents, total_cents, raised_on, due_on, sent_on, paid_on)
select v.ref, e.id, e.currency, current_date - v.from_ago, current_date - v.to_ago, v.sub, v.gst, v.sub + v.gst,
  current_date - v.raised_ago, current_date - v.raised_ago + e.invoice_days, current_date - v.raised_ago, case when v.paid then current_date - v.raised_ago + 12 end
from (values
  ('INV-0101', 'HBR', 420, 60, 58, 34000, 3400, false),
  ('INV-0102', 'KJL', 400, 50, 48, 10000, 1500, true)
) as v(ref, employer, from_ago, to_ago, raised_ago, sub, gst, paid)
join employers e on e.code = v.employer
on conflict (ref) do nothing;

-- The tests. days = days ago it was done; report, copy and regulator are days ago, null for not yet.
insert into tests (ref, worker_id, employer_id, test_code, hazard_code, kind, statutory, done_on, practitioner, value, result,
  disease_indicated, remedial_recommended, recommendation, fit, report_on, worker_copy_on, regulator_on, regulator_ref, price_cents, invoice_id, note)
select v.ref, w.id, w.employer_id, v.test, v.hazard, v.kind, v.statutory, current_date - v.days, v.practitioner, v.value, v.result,
  v.disease, v.remedial, v.recommendation, v.fit,
  current_date - v.report_ago, current_date - v.copy_ago, current_date - v.reg_ago, v.reg_ref,
  case when e.country = 'NZ' then tt.price_nz_cents else tt.price_au_cents end, i.id, null
from (values
  -- Kaimai Joinery (NZ): Aroha's audiogram is 13 months old; Sam has a 12 dB shift, no copy given, a follow-up overdue.
  ('T-1001', 'W-101', 'audiogram', 'noise', 'periodic', false, 395, 'J. Pomare RN', 4.0, 'normal', false, false, null, 'fit', 390, 385, null, null, 'INV-0102'),
  ('T-1002', 'W-101', 'spirometry', 'wood-dust', 'periodic', false, 180, 'J. Pomare RN', 94.0, 'normal', false, false, null, 'fit', 176, 170, null, null, null),
  ('T-1003', 'W-102', 'audiogram', 'noise', 'periodic', false, 60, 'J. Pomare RN', 12.0, 'abnormal', false, true, 'Repeat after 16 hours away from noise and refit hearing protection', 'fit', 52, null, null, null, null),
  ('T-1004', 'W-102', 'spirometry', 'wood-dust', 'periodic', false, 60, 'J. Pomare RN', 91.0, 'normal', false, false, null, 'fit', 52, null, null, null, null),
  -- Ruahine Foundry (NZ): Hamish's spirometry is due within the month; Rawiri's report never came back.
  ('T-1011', 'W-201', 'spirometry', 'silica', 'periodic', false, 340, 'J. Pomare RN', 88.0, 'normal', false, false, null, 'fit', 335, 330, null, null, 'INV-0102'),
  ('T-1012', 'W-201', 'chest-xray', 'silica', 'periodic', false, 700, 'Dr A. Kerr', null, 'normal', false, false, null, 'fit', 690, 686, null, null, null),
  ('T-1013', 'W-201', 'audiogram', 'noise', 'periodic', false, 150, 'J. Pomare RN', 6.0, 'normal', false, false, null, 'fit', 145, 140, null, null, null),
  ('T-1014', 'W-202', 'spirometry', 'silica', 'periodic', false, 20, 'J. Pomare RN', null, 'pending', false, false, null, null, null, null, null, null, null),
  ('T-1015', 'W-202', 'audiogram', 'noise', 'periodic', false, 20, 'J. Pomare RN', 3.0, 'normal', false, false, null, 'fit', 18, 16, null, null, null),
  ('T-1016', 'W-202', 'chest-xray', 'silica', 'baseline', false, 880, 'Dr A. Kerr', null, 'normal', false, false, null, 'fit', 870, 866, null, null, null),
  -- Hunter Battery Recyclers (NSW): lead risk work.
  ('T-1021', 'W-301', 'blood-lead', 'lead', 'periodic', true, 185, 'Dr S. Patel', 18.0, 'normal', false, false, null, 'fit', 180, 178, null, null, 'INV-0101'),
  ('T-1022', 'W-301', 'blood-lead', 'lead', 'periodic', true, 5, 'Dr S. Patel', 32.0, 'abnormal', false, true, 'Remove from lead risk work and repeat in 4 weeks', 'unfit', 3, 2, null, null, null),
  ('T-1023', 'W-301', 'audiogram', 'noise', 'periodic', true, 400, 'Dr S. Patel', 5.0, 'normal', false, false, null, 'fit', 395, 390, null, null, 'INV-0101'),
  ('T-1024', 'W-302', 'blood-lead', 'lead', 'periodic', true, 50, 'Dr S. Patel', 6.0, 'normal', false, false, null, 'fit', 46, 44, null, null, null),
  ('T-1025', 'W-302', 'audiogram', 'noise', 'periodic', true, 300, 'Dr S. Patel', 2.0, 'normal', false, false, null, 'fit', 296, 292, null, null, null),
  ('T-1026', 'W-303', 'blood-lead', 'lead', 'periodic', true, 122, 'Dr S. Patel', 12.0, 'normal', false, false, null, 'fit', 118, 115, null, null, 'INV-0101'),
  ('T-1027', 'W-303', 'audiogram', 'noise', 'periodic', true, 500, 'Dr S. Patel', 4.0, 'normal', false, false, null, 'fit', 495, 490, null, null, null),
  ('T-1028', 'W-304', 'blood-lead', 'lead', 'periodic', true, 72, 'Dr S. Patel', 34.0, 'abnormal', false, true, 'Remove from lead risk work', 'unfit', 70, 69, 69, 'SWNSW-2026-11873', 'INV-0101'),
  ('T-1029', 'W-304', 'blood-lead', 'lead', 'follow-up', true, 10, 'Dr S. Patel', 17.0, 'normal', false, false, null, 'restricted', 7, 6, null, null, null),
  ('T-1030', 'W-304', 'audiogram', 'noise', 'periodic', true, 200, 'Dr S. Patel', 3.0, 'normal', false, false, null, 'fit', 196, 190, null, null, null),
  ('T-1031', 'W-307', 'blood-lead', 'lead', 'periodic', true, 60, 'Dr S. Patel', 8.0, 'normal', false, false, null, 'fit', 57, 55, null, null, null),
  ('T-1032', 'W-307', 'audiogram', 'noise', 'periodic', true, 760, 'Dr S. Patel', 7.0, 'normal', false, false, null, 'fit', 755, 750, null, null, null),
  -- Coral Coast Stone (QLD): Sione's results suggest silica disease and the regulator has not had the report.
  ('T-1041', 'W-401', 'spirometry', 'silica', 'periodic', true, 15, 'Dr M. Ellis', 68.0, 'abnormal', true, true, 'Refer to a respiratory physician; no further dry cutting', 'restricted', 12, 10, null, null, null),
  ('T-1042', 'W-401', 'chest-xray', 'silica', 'periodic', true, 15, 'Dr M. Ellis', null, 'abnormal', true, true, 'ILO category 1/1 small rounded opacities, upper zones', 'restricted', 12, 10, null, null, null),
  ('T-1043', 'W-401', 'questionnaire', 'silica', 'periodic', true, 15, 'Dr M. Ellis', null, 'abnormal', false, false, null, null, 12, 10, null, null, null),
  ('T-1044', 'W-401', 'audiogram', 'noise', 'periodic', true, 380, 'Dr M. Ellis', 8.0, 'normal', false, false, null, 'fit', 375, 372, null, null, null),
  ('T-1045', 'W-402', 'spirometry', 'silica', 'periodic', true, 100, 'Dr M. Ellis', 97.0, 'normal', false, false, null, 'fit', 96, 94, null, null, null),
  ('T-1046', 'W-402', 'questionnaire', 'silica', 'periodic', true, 100, 'Dr M. Ellis', null, 'normal', false, false, null, null, 96, 94, null, null, null),
  ('T-1047', 'W-402', 'chest-xray', 'silica', 'baseline', true, 1290, 'Dr M. Ellis', null, 'normal', false, false, null, 'fit', 1285, 1282, null, null, null),
  ('T-1048', 'W-402', 'audiogram', 'noise', 'periodic', true, 100, 'Dr M. Ellis', 2.0, 'normal', false, false, null, 'fit', 96, 94, null, null, null),
  ('T-1049', 'W-403', 'spirometry', 'silica', 'exit', true, 32, 'Dr M. Ellis', 90.0, 'normal', false, false, null, null, 28, 27, null, null, null),
  -- Geelong Panel and Paint (VIC): Owen's spirometry is 14 months old.
  ('T-1051', 'W-501', 'spirometry', 'isocyanates', 'periodic', true, 425, 'K. Shaw RN', 92.0, 'normal', false, false, null, 'fit', 420, 418, null, null, null),
  ('T-1052', 'W-501', 'questionnaire', 'isocyanates', 'periodic', true, 200, 'K. Shaw RN', null, 'normal', false, false, null, null, 196, 195, null, null, null),
  ('T-1053', 'W-501', 'audiogram', 'noise', 'periodic', false, 300, 'K. Shaw RN', 5.0, 'normal', false, false, null, 'fit', 296, 295, null, null, null),
  ('T-1054', 'W-502', 'spirometry', 'isocyanates', 'periodic', true, 90, 'K. Shaw RN', 101.0, 'normal', false, false, null, 'fit', 86, 85, null, null, null),
  ('T-1055', 'W-502', 'questionnaire', 'isocyanates', 'periodic', true, 90, 'K. Shaw RN', null, 'normal', false, false, null, null, 86, 85, null, null, null),
  ('T-1056', 'W-502', 'audiogram', 'noise', 'baseline', false, 690, 'K. Shaw RN', 0.0, 'normal', false, false, null, 'fit', 686, 685, null, null, null)
) as v(ref, worker, test, hazard, kind, statutory, days, practitioner, value, result, disease, remedial, recommendation, fit, report_ago, copy_ago, reg_ago, reg_ref, invoice)
join workers w on w.code = v.worker
join employers e on e.id = w.employer_id
join test_types tt on tt.code = v.test
left join invoices i on i.ref = v.invoice
on conflict (ref) do nothing;

-- Older work was invoiced and paid long ago: one historical invoice per employer, totals from its tests.
insert into invoices (ref, employer_id, currency, period_from, period_to, subtotal_cents, gst_cents, total_cents, raised_on, due_on, sent_on, paid_on)
select 'INV-H' || e.code, e.id, e.currency, min(t.done_on), max(t.done_on), sum(t.price_cents),
  round(sum(t.price_cents) * case when e.country = 'NZ' then 15 else 10 end / 100.0)::bigint,
  sum(t.price_cents) + round(sum(t.price_cents) * case when e.country = 'NZ' then 15 else 10 end / 100.0)::bigint,
  max(t.done_on) + 5, max(t.done_on) + 5 + e.invoice_days, max(t.done_on) + 5, max(t.done_on) + 20
from tests t join employers e on e.id = t.employer_id
where t.invoice_id is null and t.done_on < current_date - 90
group by e.id, e.code, e.currency, e.country, e.invoice_days
on conflict (ref) do nothing;

update tests t set invoice_id = i.id
from employers e, invoices i
where e.id = t.employer_id and i.ref = 'INV-H' || e.code and t.invoice_id is null and t.done_on < current_date - 90;

insert into removals (ref, worker_id, hazard_code, test_id, removed_on, reason, regulator_on, note)
select 'R-01', w.id, 'lead', t.id, current_date - 70, 'Blood lead 34 ug/dL, at or above the removal level (r 415(1)(a))', current_date - 69, 'Moved to the receiving dock'
from workers w join tests t on t.ref = 'T-1028' where w.code = 'W-304'
on conflict (ref) do nothing;

insert into actions (ref, worker_id, test_id, what, due_on, done_on, outcome)
select v.ref, w.id, t.id, v.what, current_date + v.due_in, case when v.done then current_date - 40 end, v.outcome
from (values
  ('A-01', 'W-102', 'T-1003', 'Repeat audiogram after 16 hours away from noise; refit hearing protection', -20, false, null),
  ('A-02', 'W-401', 'T-1041', 'Respiratory physician referral and confirm no dry cutting', 14, false, null),
  ('A-03', 'W-304', 'T-1028', 'Medical examination after removal from lead risk work (r 416)', -60, true, 'Seen by Dr S. Patel; repeat blood lead monthly')
) as v(ref, worker, test, what, due_in, done, outcome)
join workers w on w.code = v.worker join tests t on t.ref = v.test
on conflict (ref) do nothing;

insert into disclosures (test_id, to_whom, purpose, disclosed_on, consent_on)
select t.id, 'Southern Cross life insurance underwriter', 'consented', current_date - 80, current_date - 85
from tests t where t.ref = 'T-1045'
  and not exists (select 1 from disclosures d where d.test_id = t.id);

insert into dna_tests (ref, worker_id, employer_id, reason, sample, collected_at, collector, screen, drug_class, brac, lab_sent_on, lab_result, lab_result_on, employer_told_on, price_cents)
select v.ref, w.id, w.employer_id, v.reason, v.sample, localtimestamp - make_interval(days => v.days) - interval '3 hours', 'K. Shaw RN', v.screen, v.class, v.brac,
  current_date - v.lab_ago, v.lab_result, current_date - v.result_ago, current_date - v.told_ago,
  case when e.country = 'NZ' then tt.price_nz_cents else tt.price_au_cents end
from (values
  ('D-01', 'W-303', 'random', 'urine', 'dna-urine', 6, 'non-negative', 'cannabinoids', null::numeric, 5, null, null, 5),
  ('D-02', 'W-103', 'pre-employment', 'urine', 'dna-urine', 12, 'negative', null, null, null, null, null, 11),
  ('D-03', 'W-402', 'post-incident', 'oral-fluid', 'dna-oral', 2, 'non-negative', 'methamphetamine', null, null, null, null, null),
  ('D-04', 'W-202', 'reasonable-cause', 'breath', 'dna-breath', 3, 'negative', null, 0.000, null, null, null, null),
  ('D-05', 'W-501', 'random', 'urine', 'dna-urine', 40, 'non-negative', 'benzodiazepines', null, 39, 'negative', 37, 37)
) as v(ref, worker, reason, sample, ttype, days, screen, class, brac, lab_ago, lab_result, result_ago, told_ago)
join workers w on w.code = v.worker
join employers e on e.id = w.employer_id
join test_types tt on tt.code = v.ttype
on conflict (ref) do nothing;

insert into activity (actor, action, ref, detail)
select v.actor, v.action, v.ref, v.detail
from (values
  ('Seed', 'seed', 'demo', 'Tasman Occupational Health demo data loaded'),
  ('Seed', 'remove', 'R-01', 'Grace Nguyen removed from lead risk work at 34 ug/dL'),
  ('Seed', 'disclose', 'T-1045', 'Report given to an insurer with the worker''s written consent')
) as v(actor, action, ref, detail)
where not exists (select 1 from activity where action = 'seed');
