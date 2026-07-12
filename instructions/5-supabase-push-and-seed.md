# 5 — Push to Supabase Project + Full Seed Data

## Part A — Getting the schema onto your actual Supabase project

You've been building migrations locally against `supabase/migrations/`. Here's how to get all of it (tables, functions, triggers, RLS, cron) onto the real hosted project so the team can see it in the Supabase dashboard.

> **Env vars**: since `.env.local` is already populated with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, there's nothing to add there — the app code from `4-auth-implementation.md` will pick those up automatically. The steps below (`supabase login` / `supabase link` / `db push`) are a separate, one-time CLI auth step and don't read from `.env.local` at all — they use your Supabase account login + the project ref/DB password instead. Run all of Part A/B/C/D on your own machine (or whichever teammate's machine has the Supabase CLI + repo cloned) — this can't be run from this sandbox since it needs live network access to your Supabase project and your account credentials.

### 1. Link the local repo to your Supabase project

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

`<your-project-ref>` is the string in your project's dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`. You'll be prompted for the database password (set when the project was created — reset it under Project Settings → Database if forgotten).

### 2. Push all 10 migrations

```bash
npx supabase db push
```

This applies every file in `supabase/migrations/` **in order** against the hosted DB. Since these have never been applied there before, it runs all 10 fresh. If you ever hand-edit a table directly in the dashboard's Table Editor after this, pull those changes back into a migration file (`npx supabase db diff -f <name>`) so the repo doesn't drift from the real DB — don't let dashboard edits become invisible.

### 3. Enable `pg_cron` (needed for the scheduled jobs from `3-database-schema.md`)

Dashboard → **Database → Extensions** → search `pg_cron` → enable. Then run the three `cron.schedule(...)` blocks from `3-database-schema.md` once via the SQL Editor (they're not part of a migration file since cron jobs are project-level state, not schema — keep them in a separate `supabase/cron.sql` reference file so they're not lost, but they only need to be *run*, not migrated, since `cron.schedule` is idempotent by job name).

Save that file now if you haven't:

```bash
mkdir -p supabase/post-deploy
```

Put the three `cron.schedule` blocks into `supabase/post-deploy/cron.sql` for reference/rerun-ability.

### 4. Run the seed data (Part B below)

```bash
npx supabase db execute -f supabase/seed.sql
```

Or paste the contents into the dashboard's SQL Editor and run it there — same effect, sometimes easier to see errors inline while iterating.

### 5. Verify

Dashboard → **Table Editor** — you should see all 12 tables populated. Dashboard → **Authentication → Users** — you should see the seeded auth users (Part B). Dashboard → **Database → Functions** — confirm `handle_new_user`, `approve_transfer`, `close_audit_cycle`, `log_activity`, etc. are all listed.

---

## Part B — Test accounts (one per role)

Simple, memorable, password matches the username pattern — **testing only, do not reuse this pattern anywhere real**:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@assetflow.test` | `admin1234` |
| Asset Manager | `manager@assetflow.test` | `manager1234` |
| Department Head | `depthead@assetflow.test` | `depthead1234` |
| Employee | `employee@assetflow.test` | `employee1234` |

These are created directly in `auth.users` (with `email_confirmed_at` pre-set so no confirmation email is needed) in the seed script below, and the `handle_new_user()` trigger auto-creates their `employee_profiles` row — the seed script then updates each row's `role` since the trigger always inserts `'Employee'` by default (correctly enforcing your signup rule even for seeded data).

---

## Part C — `supabase/seed.sql` (full dump, replace the placeholder version)

This is long — copy the whole thing into `supabase/seed.sql`, overwriting what's there. It seeds 10+ rows for every table (more where noted).

```sql
-- ============================================================
-- DEPARTMENTS (6)
-- ============================================================
insert into departments (id, name, status) values
  ('d1000000-0000-0000-0000-000000000001', 'Engineering', 'Active'),
  ('d1000000-0000-0000-0000-000000000002', 'Facilities', 'Active'),
  ('d1000000-0000-0000-0000-000000000003', 'Field Ops', 'Active'),
  ('d1000000-0000-0000-0000-000000000004', 'Human Resources', 'Active'),
  ('d1000000-0000-0000-0000-000000000005', 'IT Support', 'Active'),
  ('d1000000-0000-0000-0000-000000000006', 'Finance (legacy)', 'Inactive');

-- sub-department to exercise the hierarchy
update departments set parent_department_id = 'd1000000-0000-0000-0000-000000000001'
  where id = 'd1000000-0000-0000-0000-000000000005';

-- ============================================================
-- ASSET CATEGORIES (6)
-- ============================================================
insert into asset_categories (id, name, extra_fields) values
  ('c1000000-0000-0000-0000-000000000001', 'Electronics', '{"warranty_period_months": 24}'),
  ('c1000000-0000-0000-0000-000000000002', 'Furniture', '{}'),
  ('c1000000-0000-0000-0000-000000000003', 'Vehicles', '{"insurance_renewal_month": 6}'),
  ('c1000000-0000-0000-0000-000000000004', 'IT Equipment', '{"warranty_period_months": 36}'),
  ('c1000000-0000-0000-0000-000000000005', 'Office Supplies', '{}'),
  ('c1000000-0000-0000-0000-000000000006', 'Facility Rooms', '{}');

-- ============================================================
-- AUTH USERS + EMPLOYEE PROFILES (12: 4 named test logins + 8 supporting)
-- Directly inserting into auth.users is the standard way to seed test
-- accounts (Supabase's GoTrue reads straight from this table).
-- email_confirmed_at is set so these can log in immediately, no email step.
-- ============================================================
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@assetflow.test', crypt('admin1234', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Aditi Admin"}'),
  ('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'manager@assetflow.test', crypt('manager1234', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Manoj Manager"}'),
  ('e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'depthead@assetflow.test', crypt('depthead1234', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Divya Depthead"}'),
  ('e1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'employee@assetflow.test', crypt('employee1234', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Ekta Employee"}'),
  ('e1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'priya.shah@assetflow.test', crypt('priya12345', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Priya Shah"}'),
  ('e1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'raj.mehta@assetflow.test', crypt('raj123456', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Raj Mehta"}'),
  ('e1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'arjun.nair@assetflow.test', crypt('arjun12345', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Arjun Nair"}'),
  ('e1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'sana.iqbal@assetflow.test', crypt('sana123456', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Sana Iqbal"}'),
  ('e1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'aditi.rao@assetflow.test', crypt('aditi123456', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Aditi Rao"}'),
  ('e1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'rohan.mehta@assetflow.test', crypt('rohan123456', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Rohan Mehta"}'),
  ('e1000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'lisa.gomes@assetflow.test', crypt('lisa123456', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Lisa Gomes"}'),
  ('e1000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'karan.shah@assetflow.test', crypt('karan123456', gen_salt('bf')), now(), now(), now(), '{}', '{"full_name":"Karan Shah"}');

-- handle_new_user() trigger has now auto-created 12 employee_profiles rows, all role='Employee'.
-- Update roles/departments/status to match intended test personas:
update employee_profiles set role = 'Admin', department_id = 'd1000000-0000-0000-0000-000000000001'
  where id = 'e1000000-0000-0000-0000-000000000001';
update employee_profiles set role = 'Asset Manager', department_id = 'd1000000-0000-0000-0000-000000000002'
  where id = 'e1000000-0000-0000-0000-000000000002';
update employee_profiles set role = 'Department Head', department_id = 'd1000000-0000-0000-0000-000000000001'
  where id = 'e1000000-0000-0000-0000-000000000003';
update employee_profiles set department_id = 'd1000000-0000-0000-0000-000000000003'
  where id = 'e1000000-0000-0000-0000-000000000004'; -- stays Employee

update employee_profiles set department_id = 'd1000000-0000-0000-0000-000000000001' where id = 'e1000000-0000-0000-0000-000000000005';
update employee_profiles set department_id = 'd1000000-0000-0000-0000-000000000001' where id = 'e1000000-0000-0000-0000-000000000006';
update employee_profiles set department_id = 'd1000000-0000-0000-0000-000000000002' where id = 'e1000000-0000-0000-0000-000000000007';
update employee_profiles set role = 'Department Head', department_id = 'd1000000-0000-0000-0000-000000000004' where id = 'e1000000-0000-0000-0000-000000000008';
update employee_profiles set role = 'Asset Manager', department_id = 'd1000000-0000-0000-0000-000000000005' where id = 'e1000000-0000-0000-0000-000000000009';
update employee_profiles set department_id = 'd1000000-0000-0000-0000-000000000003' where id = 'e1000000-0000-0000-0000-000000000010';
update employee_profiles set department_id = 'd1000000-0000-0000-0000-000000000004' where id = 'e1000000-0000-0000-0000-000000000011';
update employee_profiles set status = 'Inactive', department_id = 'd1000000-0000-0000-0000-000000000006' where id = 'e1000000-0000-0000-0000-000000000012';

-- wire department heads now that employees exist
update departments set head_employee_id = 'e1000000-0000-0000-0000-000000000003' where id = 'd1000000-0000-0000-0000-000000000001';
update departments set head_employee_id = 'e1000000-0000-0000-0000-000000000008' where id = 'd1000000-0000-0000-0000-000000000004';

-- ============================================================
-- ASSETS (15)
-- ============================================================
insert into assets (id, name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, department_id, status, is_bookable) values
  ('a1000000-0000-0000-0000-000000000001', 'Dell Latitude Laptop', 'c1000000-0000-0000-0000-000000000004', 'SN-DL-1001', '2024-03-12', 85000, 'Good', 'Bangalore HQ - Desk R12', 'd1000000-0000-0000-0000-000000000001', 'Allocated', false),
  ('a1000000-0000-0000-0000-000000000002', 'Epson Projector', 'c1000000-0000-0000-0000-000000000001', 'SN-EP-2002', '2023-06-01', 42000, 'Fair', 'HQ Floor 2 - Room B2', 'd1000000-0000-0000-0000-000000000002', 'Under Maintenance', true),
  ('a1000000-0000-0000-0000-000000000003', 'Office Chair (Ergonomic)', 'c1000000-0000-0000-0000-000000000002', 'SN-OC-3003', '2022-11-20', 9500, 'Good', 'Warehouse Bay 3', 'd1000000-0000-0000-0000-000000000002', 'Available', false),
  ('a1000000-0000-0000-0000-000000000004', 'Conference Room B2', 'c1000000-0000-0000-0000-000000000006', null, '2021-01-01', 0, 'Good', 'HQ Floor 2', 'd1000000-0000-0000-0000-000000000002', 'Available', true),
  ('a1000000-0000-0000-0000-000000000005', 'Forklift (Toyota)', 'c1000000-0000-0000-0000-000000000003', 'SN-FL-4004', '2020-05-15', 650000, 'Good', 'Field Ops Yard', 'd1000000-0000-0000-0000-000000000003', 'Available', true),
  ('a1000000-0000-0000-0000-000000000006', 'HP Color Printer', 'c1000000-0000-0000-0000-000000000004', 'SN-HP-5005', '2023-09-09', 28000, 'Fair', 'HQ Floor 1 - Print Room', 'd1000000-0000-0000-0000-000000000005', 'Under Maintenance', false),
  ('a1000000-0000-0000-0000-000000000007', 'Canon DSLR Camera', 'c1000000-0000-0000-0000-000000000001', 'SN-CN-6006', '2021-08-01', 65000, 'Good', 'Marketing Store', 'd1000000-0000-0000-0000-000000000004', 'Available', true),
  ('a1000000-0000-0000-0000-000000000008', 'Standing Desk', 'c1000000-0000-0000-0000-000000000002', 'SN-SD-7007', '2024-01-10', 18000, 'Good', 'HQ Floor 3 - Desk E19', 'd1000000-0000-0000-0000-000000000001', 'Allocated', false),
  ('a1000000-0000-0000-0000-000000000009', 'Mahindra Bolero (Field Vehicle)', 'c1000000-0000-0000-0000-000000000003', 'SN-MB-8008', '2019-04-22', 850000, 'Fair', 'Field Ops Yard', 'd1000000-0000-0000-0000-000000000003', 'Reserved', true),
  ('a1000000-0000-0000-0000-000000000010', 'MacBook Pro 16"', 'c1000000-0000-0000-0000-000000000004', 'SN-MP-9009', '2024-06-18', 210000, 'Good', 'HQ Floor 2 - Desk R18', 'd1000000-0000-0000-0000-000000000001', 'Available', false),
  ('a1000000-0000-0000-0000-000000000011', 'Meeting Room Alpha', 'c1000000-0000-0000-0000-000000000006', null, '2021-01-01', 0, 'Good', 'HQ Floor 1', 'd1000000-0000-0000-0000-000000000002', 'Available', true),
  ('a1000000-0000-0000-0000-000000000012', 'Whiteboard Cart', 'c1000000-0000-0000-0000-000000000005', 'SN-WC-1010', '2022-02-14', 4200, 'Good', 'HQ Floor 3 Storage', 'd1000000-0000-0000-0000-000000000002', 'Available', false),
  ('a1000000-0000-0000-0000-000000000013', 'Cisco Router', 'c1000000-0000-0000-0000-000000000004', 'SN-CR-1111', '2020-10-05', 32000, 'Fair', 'Server Room', 'd1000000-0000-0000-0000-000000000005', 'Retired', false),
  ('a1000000-0000-0000-0000-000000000014', 'Old Desktop PC', 'c1000000-0000-0000-0000-000000000004', 'SN-DP-1212', '2017-03-01', 45000, 'Poor', 'Storage - unlisted', 'd1000000-0000-0000-0000-000000000006', 'Disposed', false),
  ('a1000000-0000-0000-0000-000000000015', 'Security Camera Unit', 'c1000000-0000-0000-0000-000000000001', 'SN-SC-1313', '2023-01-01', 15000, 'Good', 'HQ Entrance', 'd1000000-0000-0000-0000-000000000002', 'Lost', false);

-- ============================================================
-- ALLOCATIONS (10) — one row deliberately Active to demonstrate the conflict rule
-- ============================================================
insert into allocations (id, asset_id, employee_id, allocated_at, expected_return_date, status) values
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005', '2025-03-12', '2026-08-01', 'Active'), -- Priya has AF laptop, active -> triggers conflict UI if re-allocated
  ('f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000006', '2025-01-09', '2026-06-15', 'Active'),
  ('f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000007', '2024-11-20', '2025-05-01', 'Returned'),
  ('f1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000009', '2024-06-01', '2024-12-01', 'Returned'),
  ('f1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000010', '2025-02-15', '2026-01-10', 'Active'),
  ('f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000011', '2025-05-05', '2025-11-05', 'Returned'),
  ('f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', null, '2023-06-01', null, 'Transferred'),
  ('f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000004', '2025-04-01', '2025-10-01', 'Returned'),
  ('f1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000009', null, '2025-07-01', '2026-01-01', 'Active'),
  ('f1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000012', '2022-01-01', '2022-06-01', 'Returned');

-- allocation 9 targets a department instead of an employee (per schema's chk_holder)
update allocations set department_id = 'd1000000-0000-0000-0000-000000000003' where id = 'f1000000-0000-0000-0000-000000000009';

-- ============================================================
-- TRANSFER REQUESTS (6)
-- ============================================================
insert into transfer_requests (id, allocation_id, asset_id, from_employee_id, to_employee_id, reason, status, requested_by) values
  ('11100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000006', 'Priya moving to a different project, Raj needs a laptop', 'Requested', 'e1000000-0000-0000-0000-000000000006'),
  ('11100000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000007', 'Desk reassignment', 'Requested', 'e1000000-0000-0000-0000-000000000007'),
  ('11100000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000011', 'Handover before leave', 'Approved', 'e1000000-0000-0000-0000-000000000010'),
  ('11100000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000009', 'Role change', 'Rejected', 'e1000000-0000-0000-0000-000000000009'),
  ('11100000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000004', 'Team move', 'Reallocated', 'e1000000-0000-0000-0000-000000000011'),
  ('11100000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000005', 'Printer needed elsewhere', 'Requested', 'e1000000-0000-0000-0000-000000000005');

-- ============================================================
-- RESOURCE BOOKINGS (12) — includes a deliberate adjacent (non-overlapping) pair to show the "touching is OK" rule
-- ============================================================
insert into resource_bookings (id, resource_asset_id, booked_by, starts_at, ends_at, status) values
  ('22200000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000005', '2026-07-14 09:00+05:30', '2026-07-14 10:00+05:30', 'Upcoming'),
  ('22200000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000006', '2026-07-14 10:00+05:30', '2026-07-14 11:00+05:30', 'Upcoming'), -- adjacent, valid
  ('22200000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000007', '2026-07-15 14:00+05:30', '2026-07-15 15:30+05:30', 'Upcoming'),
  ('22200000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000010', '2026-07-13 08:00+05:30', '2026-07-13 12:00+05:30', 'Completed'),
  ('22200000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000011', '2026-07-16 09:00+05:30', '2026-07-16 17:00+05:30', 'Upcoming'),
  ('22200000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000004', '2026-07-12 13:00+05:30', '2026-07-12 15:00+05:30', 'Ongoing'),
  ('22200000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000009', '2026-07-17 09:00+05:30', '2026-07-17 10:30+05:30', 'Upcoming'),
  ('22200000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000005', '2026-07-10 11:00+05:30', '2026-07-10 12:00+05:30', 'Completed'),
  ('22200000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000012', '2026-06-01 09:00+05:30', '2026-06-01 17:00+05:30', 'Cancelled'),
  ('22200000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000007', '2026-07-18 15:00+05:30', '2026-07-18 16:00+05:30', 'Upcoming'),
  ('22200000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000006', '2026-07-20 08:00+05:30', '2026-07-20 10:00+05:30', 'Upcoming'),
  ('22200000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000010', '2026-07-11 09:00+05:30', '2026-07-11 09:45+05:30', 'Completed');

-- ============================================================
-- MAINTENANCE REQUESTS (10) — spans every workflow stage
-- ============================================================
insert into maintenance_requests (id, asset_id, raised_by, issue_description, priority, status, approved_by, technician_name, resolved_at) values
  ('33300000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000005', 'Projector bulb not turning on', 'Medium', 'Pending', null, null, null),
  ('33300000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000009', 'AC unit noisy compressor', 'High', 'Approved', 'e1000000-0000-0000-0000-000000000002', null, null),
  ('33300000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000010', 'Forklift hydraulic leak', 'Critical', 'Technician Assigned', 'e1000000-0000-0000-0000-000000000002', 'R. Varma', null),
  ('33300000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000013', 'e1000000-0000-0000-0000-000000000012', 'Printer jam, parts ordered', 'Low', 'In Progress', 'e1000000-0000-0000-0000-000000000002', 'S. Patel', null),
  ('33300000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000004', 'Chair repair', 'Low', 'Resolved', 'e1000000-0000-0000-0000-000000000002', 'In-house', '2026-07-07'),
  ('33300000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000010', 'Lens focus ring stuck', 'Medium', 'Rejected', 'e1000000-0000-0000-0000-000000000002', null, null),
  ('33300000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000009', 'e1000000-0000-0000-0000-000000000011', 'Engine warning light on', 'High', 'Pending', null, null, null),
  ('33300000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000012', 'e1000000-0000-0000-0000-000000000006', 'Wheel casters broken', 'Low', 'Resolved', 'e1000000-0000-0000-0000-000000000002', 'In-house', '2026-05-20'),
  ('33300000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000010', 'e1000000-0000-0000-0000-000000000007', 'Battery not holding charge', 'Medium', 'Approved', 'e1000000-0000-0000-0000-000000000002', null, null),
  ('33300000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000006', 'Height adjustment motor stuck', 'Medium', 'In Progress', 'e1000000-0000-0000-0000-000000000002', 'S. Patel', null);

-- ============================================================
-- AUDIT CYCLES (2), AUDITORS, AUDIT ITEMS (12)
-- ============================================================
insert into audit_cycles (id, name, scope_department_id, start_date, end_date, status) values
  ('44400000-0000-0000-0000-000000000001', 'Q3 Audit — Engineering Dept', 'd1000000-0000-0000-0000-000000000001', '2026-07-01', '2026-07-15', 'Open'),
  ('44400000-0000-0000-0000-000000000002', 'Q2 Audit — Facilities', 'd1000000-0000-0000-0000-000000000002', '2026-04-01', '2026-04-10', 'Closed');

insert into audit_cycle_auditors (audit_cycle_id, employee_id) values
  ('44400000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000009'),
  ('44400000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000008'),
  ('44400000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002');

insert into audit_items (id, audit_cycle_id, asset_id, expected_location, verification, verified_by, verified_at) values
  ('55500000-0000-0000-0000-000000000001', '44400000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Desk R12', 'Verified', 'e1000000-0000-0000-0000-000000000009', now()),
  ('55500000-0000-0000-0000-000000000002', '44400000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000008', 'Desk E19', 'Verified', 'e1000000-0000-0000-0000-000000000009', now()),
  ('55500000-0000-0000-0000-000000000003', '44400000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'Desk R18', 'Missing', 'e1000000-0000-0000-0000-000000000008', now()),
  ('55500000-0000-0000-0000-000000000004', '44400000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000015', 'HQ Entrance', 'Missing', 'e1000000-0000-0000-0000-000000000008', now()),
  ('55500000-0000-0000-0000-000000000005', '44400000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000013', 'Server Room', 'Damaged', 'e1000000-0000-0000-0000-000000000009', now()),
  ('55500000-0000-0000-0000-000000000006', '44400000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000014', 'Storage', 'Pending', null, null),
  ('55500000-0000-0000-0000-000000000007', '44400000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Room B2', 'Verified', 'e1000000-0000-0000-0000-000000000002', '2026-04-05'),
  ('55500000-0000-0000-0000-000000000008', '44400000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'Warehouse Bay 3', 'Verified', 'e1000000-0000-0000-0000-000000000002', '2026-04-05'),
  ('55500000-0000-0000-0000-000000000009', '44400000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'HQ Floor 2', 'Verified', 'e1000000-0000-0000-0000-000000000002', '2026-04-06'),
  ('55500000-0000-0000-0000-000000000010', '44400000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000011', 'HQ Floor 1', 'Verified', 'e1000000-0000-0000-0000-000000000002', '2026-04-06'),
  ('55500000-0000-0000-0000-000000000011', '44400000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000012', 'HQ Floor 3', 'Damaged', 'e1000000-0000-0000-0000-000000000002', '2026-04-07'),
  ('55500000-0000-0000-0000-000000000012', '44400000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'Print Room', 'Verified', 'e1000000-0000-0000-0000-000000000002', '2026-04-08');

-- ============================================================
-- NOTIFICATIONS (12)
-- ============================================================
insert into notifications (recipient_id, type, message, related_entity_type, related_entity_id, is_read) values
  ('e1000000-0000-0000-0000-000000000005', 'Asset Assigned', 'Laptop AF-0001 assigned to you', 'allocation', 'f1000000-0000-0000-0000-000000000001', true),
  ('e1000000-0000-0000-0000-000000000002', 'Maintenance Approved', 'AC unit maintenance request approved', 'maintenance_request', '33300000-0000-0000-0000-000000000002', false),
  ('e1000000-0000-0000-0000-000000000005', 'Booking Confirmed', 'Conference Room B2 booking confirmed 9:00-10:00', 'booking', '22200000-0000-0000-0000-000000000001', true),
  ('e1000000-0000-0000-0000-000000000007', 'Transfer Approved', 'Transfer of camera AF-0007 approved', 'transfer_request', '11100000-0000-0000-0000-000000000003', false),
  ('e1000000-0000-0000-0000-000000000006', 'Overdue Return Alert', 'Standing desk AF-0008 is overdue for return', 'allocation', 'f1000000-0000-0000-0000-000000000002', false),
  ('e1000000-0000-0000-0000-000000000008', 'Audit Discrepancy Flagged', 'Asset AF-0015 flagged as Missing in Q3 audit', 'audit_item', '55500000-0000-0000-0000-000000000004', false),
  ('e1000000-0000-0000-0000-000000000004', 'Booking Reminder', 'Your booking for Canon DSLR Camera starts soon', 'booking', '22200000-0000-0000-0000-000000000006', false),
  ('e1000000-0000-0000-0000-000000000012', 'Overdue Return Alert', 'Cisco router AF-0013 was due 3 days ago', 'allocation', 'f1000000-0000-0000-0000-000000000010', false),
  ('e1000000-0000-0000-0000-000000000009', 'Maintenance Rejected', 'Camera lens maintenance request rejected', 'maintenance_request', '33300000-0000-0000-0000-000000000006', true),
  ('e1000000-0000-0000-0000-000000000010', 'Booking Cancelled', 'Field vehicle booking on 1 Jun was cancelled', 'booking', '22200000-0000-0000-0000-000000000009', true),
  ('e1000000-0000-0000-0000-000000000003', 'Asset Assigned', 'Standing desk AF-0008 assigned to Raj Mehta', 'allocation', 'f1000000-0000-0000-0000-000000000002', false),
  ('e1000000-0000-0000-0000-000000000011', 'Audit Discrepancy Flagged', 'Whiteboard cart flagged as Damaged in Q2 audit', 'audit_item', '55500000-0000-0000-0000-000000000011', true);

-- ============================================================
-- ACTIVITY LOG (12)
-- ============================================================
insert into activity_log (actor_id, action, entity_type, entity_id, metadata) values
  ('e1000000-0000-0000-0000-000000000002', 'asset.registered', 'asset', 'a1000000-0000-0000-0000-000000000001', '{"asset_tag":"AF-0001"}'),
  ('e1000000-0000-0000-0000-000000000002', 'allocation.created', 'allocation', 'f1000000-0000-0000-0000-000000000001', '{"employee":"Priya Shah"}'),
  ('e1000000-0000-0000-0000-000000000006', 'transfer.requested', 'transfer_request', '11100000-0000-0000-0000-000000000002', '{}'),
  ('e1000000-0000-0000-0000-000000000002', 'maintenance.approved', 'maintenance_request', '33300000-0000-0000-0000-000000000002', '{}'),
  ('e1000000-0000-0000-0000-000000000005', 'booking.created', 'booking', '22200000-0000-0000-0000-000000000001', '{}'),
  ('e1000000-0000-0000-0000-000000000009', 'audit_item.verified', 'audit_item', '55500000-0000-0000-0000-000000000001', '{"result":"Verified"}'),
  ('e1000000-0000-0000-0000-000000000008', 'audit_item.verified', 'audit_item', '55500000-0000-0000-0000-000000000004', '{"result":"Missing"}'),
  ('e1000000-0000-0000-0000-000000000001', 'employee.promoted', 'employee_profile', 'e1000000-0000-0000-0000-000000000002', '{"new_role":"Asset Manager"}'),
  ('e1000000-0000-0000-0000-000000000001', 'employee.promoted', 'employee_profile', 'e1000000-0000-0000-0000-000000000003', '{"new_role":"Department Head"}'),
  ('e1000000-0000-0000-0000-000000000010', 'booking.cancelled', 'booking', '22200000-0000-0000-0000-000000000009', '{}'),
  ('e1000000-0000-0000-0000-000000000002', 'maintenance.resolved', 'maintenance_request', '33300000-0000-0000-0000-000000000005', '{}'),
  ('e1000000-0000-0000-0000-000000000002', 'audit_cycle.closed', 'audit_cycle', '44400000-0000-0000-0000-000000000002', '{}');
```

### Note on `crypt()` / `gen_salt()` used above

These come from the `pgcrypto` extension, already enabled in `0001_departments.sql`. If you get a "function crypt does not exist" error, run `create extension if not exists pgcrypto;` once in the SQL editor first.

---

## Part D — Re-running the seed safely during development

`db execute -f supabase/seed.sql` will fail on a second run because of the unique IDs/emails (that's intentional — prevents silent duplicate data). To reset and reseed cleanly during the hackathon as the schema evolves:

```bash
npx supabase db reset   # local only — reapplies all migrations + seed.sql fresh
```

For the **hosted** project (no destructive `db reset` equivalent), instead truncate before reseeding:

```sql
truncate table
  activity_log, notifications, audit_items, audit_cycle_auditors, audit_cycles,
  maintenance_requests, resource_bookings, transfer_requests, allocations,
  assets, employee_profiles, asset_categories, departments
  restart identity cascade;

delete from auth.users where email like '%@assetflow.test';
```

Then re-run the seed script.

---

## Part E — After seeding, regenerate types

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.types.ts
```

(Use `--project-id` here instead of `--local` since you're pointing at the hosted project now. `<your-project-ref>` is the same value you used in the `supabase link` step in Part A — it's also visible in your existing `.env.local`'s `NEXT_PUBLIC_SUPABASE_URL`, as the subdomain: `https://<project-ref>.supabase.co`.)
