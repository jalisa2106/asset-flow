# 3 — Database Schema (Supabase / Postgres)

This is the full schema to implement across the already-scaffolded migration files in `supabase/migrations/`. Copy each numbered section into its matching file. Run in order — later files depend on earlier ones.

Conventions used throughout:
- All tables have `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
- All FKs use `on delete restrict` by default (data integrity matters more than convenience here) except where explicitly noted (e.g. logs/notifications use `on delete set null` so history survives entity deletion).
- Enums are used for fixed-vocabulary fields instead of free-text, per AGENTS.md Section 3.

Enable the extension needed for UUIDs and overlap constraints first, in `0001_departments.sql` before the first `CREATE TABLE`:

```sql
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- needed for the booking overlap EXCLUDE constraint
```

---

## 0001_departments.sql

```sql
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  head_employee_id uuid, -- FK added after employee_profiles exists (0003), nullable for now
  parent_department_id uuid references departments(id) on delete set null,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_departments_parent on departments(parent_department_id);
create index idx_departments_status on departments(status);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_departments_updated_at
before update on departments
for each row execute function set_updated_at();
```

> `set_updated_at()` is created once here and reused by every later table — don't redefine it in later migration files.

---

## 0002_asset_categories.sql

```sql
create table asset_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  extra_fields jsonb not null default '{}'::jsonb, -- e.g. {"warranty_period_months": 24}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_categories_updated_at
before update on asset_categories
for each row execute function set_updated_at();
```

---

## 0003_employee_profiles.sql

```sql
create type user_role as enum ('Admin', 'Asset Manager', 'Department Head', 'Employee');

create table employee_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  department_id uuid references departments(id) on delete set null,
  role user_role not null default 'Employee', -- default on signup; ONLY changed via promotion endpoint
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_employee_department on employee_profiles(department_id);
create index idx_employee_role on employee_profiles(role);
create index idx_employee_status on employee_profiles(status);

create trigger trg_employees_updated_at
before update on employee_profiles
for each row execute function set_updated_at();

-- Now that employee_profiles exists, wire the department head FK deferred from 0001
alter table departments
  add constraint fk_departments_head
  foreign key (head_employee_id) references employee_profiles(id) on delete set null;

-- Auto-create an employee_profiles row on signup (Employee role only, no role param accepted here)
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.employee_profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    'Employee',
    'Active'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
```

---

## 0004_assets.sql

```sql
create type asset_status as enum (
  'Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'
);

create sequence asset_tag_seq start 1;

create table assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique default ('AF-' || lpad(nextval('asset_tag_seq')::text, 4, '0')),
  name text not null,
  category_id uuid not null references asset_categories(id) on delete restrict,
  serial_number text,
  acquisition_date date,
  acquisition_cost numeric(12,2), -- reporting/ranking only, never linked to accounting logic
  condition text not null default 'Good',
  location text,
  department_id uuid references departments(id) on delete set null,
  status asset_status not null default 'Available',
  is_bookable boolean not null default false, -- "shared/bookable" flag
  photo_url text,
  document_urls text[] default '{}',
  qr_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_status on assets(status);
create index idx_assets_category on assets(category_id);
create index idx_assets_department on assets(department_id);
create index idx_assets_location on assets(location);
create index idx_assets_bookable on assets(is_bookable) where is_bookable = true;
-- full text search across tag/name/serial for Screen 4's search bar
create index idx_assets_search on assets using gin (
  to_tsvector('english', coalesce(asset_tag,'') || ' ' || coalesce(name,'') || ' ' || coalesce(serial_number,''))
);

create trigger trg_assets_updated_at
before update on assets
for each row execute function set_updated_at();

-- Enforce valid lifecycle transitions server-side (AGENTS.md Section 3, rule 2)
create or replace function validate_asset_status_transition()
returns trigger language plpgsql as $$
declare
  allowed boolean := false;
begin
  if old.status = new.status then
    return new;
  end if;

  allowed := case old.status
    when 'Available' then new.status in ('Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired')
    when 'Allocated' then new.status in ('Available', 'Under Maintenance', 'Lost')
    when 'Reserved' then new.status in ('Available', 'Allocated', 'Under Maintenance')
    when 'Under Maintenance' then new.status in ('Available', 'Retired', 'Lost')
    when 'Lost' then new.status in ('Available', 'Disposed') -- recovered lost asset, or written off
    when 'Retired' then new.status in ('Disposed')
    when 'Disposed' then false -- terminal state
    else false
  end;

  if not allowed then
    raise exception 'Invalid asset status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger trg_validate_asset_status
before update of status on assets
for each row execute function validate_asset_status_transition();
```

---

## 0005_allocations_transfers.sql

```sql
create type allocation_status as enum ('Active', 'Returned', 'Transferred');
create type transfer_status as enum ('Requested', 'Approved', 'Rejected', 'Reallocated');

create table allocations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete restrict,
  employee_id uuid references employee_profiles(id) on delete set null,
  department_id uuid references departments(id) on delete set null, -- allocation can target dept instead of a person
  allocated_at timestamptz not null default now(),
  expected_return_date date,
  returned_at timestamptz,
  return_condition_notes text,
  status allocation_status not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_holder check (employee_id is not null or department_id is not null)
);

-- Core conflict rule: an asset can only have ONE active allocation at a time.
create unique index uidx_one_active_allocation_per_asset
  on allocations(asset_id) where (status = 'Active');

create index idx_allocations_employee on allocations(employee_id);
create index idx_allocations_department on allocations(department_id);
create index idx_allocations_status on allocations(status);
create index idx_allocations_overdue on allocations(expected_return_date) where status = 'Active';

create trigger trg_allocations_updated_at
before update on allocations
for each row execute function set_updated_at();

create table transfer_requests (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references allocations(id) on delete restrict,
  asset_id uuid not null references assets(id) on delete restrict,
  from_employee_id uuid references employee_profiles(id) on delete set null,
  to_employee_id uuid not null references employee_profiles(id) on delete restrict,
  reason text,
  status transfer_status not null default 'Requested',
  requested_by uuid references employee_profiles(id) on delete set null,
  approved_by uuid references employee_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transfers_status on transfer_requests(status);
create index idx_transfers_asset on transfer_requests(asset_id);

create trigger trg_transfers_updated_at
before update on transfer_requests
for each row execute function set_updated_at();

-- Approving a transfer: close old allocation, open new one, flip status to Reallocated, update asset dept if needed.
create or replace function approve_transfer(p_transfer_id uuid, p_approver_id uuid)
returns void language plpgsql security definer as $$
declare
  t transfer_requests%rowtype;
begin
  select * into t from transfer_requests where id = p_transfer_id for update;
  if t.status <> 'Requested' then
    raise exception 'Transfer request is not pending';
  end if;

  update allocations set status = 'Transferred', returned_at = now()
    where id = t.allocation_id;

  insert into allocations (asset_id, employee_id, allocated_at, status)
    values (t.asset_id, t.to_employee_id, now(), 'Active');

  update transfer_requests
    set status = 'Reallocated', approved_by = p_approver_id
    where id = p_transfer_id;
end;
$$;
```

---

## 0006_resource_bookings.sql

```sql
create type booking_status as enum ('Upcoming', 'Ongoing', 'Completed', 'Cancelled');

create table resource_bookings (
  id uuid primary key default gen_random_uuid(),
  resource_asset_id uuid not null references assets(id) on delete restrict, -- must be is_bookable = true
  booked_by uuid not null references employee_profiles(id) on delete set null,
  booked_for_department_id uuid references departments(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status booking_status not null default 'Upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_booking_time_order check (ends_at > starts_at),

  -- THE overlap rule, enforced at the database level (not just app code):
  -- two bookings for the same resource cannot have overlapping [starts_at, ends_at) ranges,
  -- but touching ranges (one ends exactly when another starts) ARE allowed.
  exclude using gist (
    resource_asset_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('Upcoming', 'Ongoing'))
);

create index idx_bookings_resource on resource_bookings(resource_asset_id);
create index idx_bookings_status on resource_bookings(status);
create index idx_bookings_time_range on resource_bookings using gist (tstzrange(starts_at, ends_at));

create trigger trg_bookings_updated_at
before update on resource_bookings
for each row execute function set_updated_at();
```

> The `exclude using gist` constraint is the whole overlap rule — if a second insert/update would overlap, Postgres rejects it at the transaction level. Your route handler should catch the resulting `23P01` (exclusion_violation) error and translate it into the "slot is unavailable" response shown in Screen 6.

---

## 0007_maintenance_requests.sql

```sql
create type maintenance_status as enum (
  'Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved'
);
create type maintenance_priority as enum ('Low', 'Medium', 'High', 'Critical');

create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete restrict,
  raised_by uuid references employee_profiles(id) on delete set null,
  issue_description text not null,
  priority maintenance_priority not null default 'Medium',
  photo_url text,
  status maintenance_status not null default 'Pending',
  approved_by uuid references employee_profiles(id) on delete set null,
  technician_name text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_maintenance_status on maintenance_requests(status);
create index idx_maintenance_asset on maintenance_requests(asset_id);
create index idx_maintenance_priority on maintenance_requests(priority);

create trigger trg_maintenance_updated_at
before update on maintenance_requests
for each row execute function set_updated_at();

-- Asset flips to "Under Maintenance" only on Approved, back to "Available" only on Resolved.
create or replace function sync_asset_status_on_maintenance()
returns trigger language plpgsql as $$
begin
  if new.status = 'Approved' and old.status = 'Pending' then
    update assets set status = 'Under Maintenance' where id = new.asset_id;
  elsif new.status = 'Resolved' and old.status <> 'Resolved' then
    update assets set status = 'Available' where id = new.asset_id;
    new.resolved_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_maintenance_status_sync
before update of status on maintenance_requests
for each row execute function sync_asset_status_on_maintenance();
```

---

## 0008_audit_cycles.sql

```sql
create type audit_cycle_status as enum ('Open', 'Closed');
create type audit_verification as enum ('Pending', 'Verified', 'Missing', 'Damaged');

create table audit_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope_department_id uuid references departments(id) on delete set null,
  scope_location text,
  start_date date not null,
  end_date date not null,
  status audit_cycle_status not null default 'Open',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_cycle_auditors (
  audit_cycle_id uuid not null references audit_cycles(id) on delete cascade,
  employee_id uuid not null references employee_profiles(id) on delete cascade,
  primary key (audit_cycle_id, employee_id)
);

create table audit_items (
  id uuid primary key default gen_random_uuid(),
  audit_cycle_id uuid not null references audit_cycles(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete restrict,
  expected_location text,
  verification audit_verification not null default 'Pending',
  verified_by uuid references employee_profiles(id) on delete set null,
  verified_at timestamptz,
  notes text,
  unique (audit_cycle_id, asset_id)
);

create index idx_audit_items_cycle on audit_items(audit_cycle_id);
create index idx_audit_items_verification on audit_items(verification);

create trigger trg_audit_cycles_updated_at
before update on audit_cycles
for each row execute function set_updated_at();

-- Closing a cycle: lock it, flip confirmed-missing assets to Lost, and no further edits allowed.
create or replace function close_audit_cycle(p_cycle_id uuid)
returns void language plpgsql security definer as $$
begin
  update assets a set status = 'Lost'
  from audit_items ai
  where ai.audit_cycle_id = p_cycle_id
    and ai.asset_id = a.id
    and ai.verification = 'Missing';

  update audit_cycles set status = 'Closed', closed_at = now() where id = p_cycle_id;
end;
$$;

-- Prevent edits to audit_items once the parent cycle is closed
create or replace function prevent_edit_after_close()
returns trigger language plpgsql as $$
begin
  if (select status from audit_cycles where id = new.audit_cycle_id) = 'Closed' then
    raise exception 'Audit cycle is closed; verification can no longer be edited';
  end if;
  return new;
end;
$$;

create trigger trg_audit_items_lock
before update on audit_items
for each row execute function prevent_edit_after_close();
```

---

## 0009_notifications_activity_log.sql

```sql
create type notification_type as enum (
  'Asset Assigned', 'Maintenance Approved', 'Maintenance Rejected',
  'Booking Confirmed', 'Booking Cancelled', 'Booking Reminder',
  'Transfer Approved', 'Overdue Return Alert', 'Audit Discrepancy Flagged'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references employee_profiles(id) on delete set null,
  type notification_type not null,
  message text not null,
  related_entity_type text, -- 'asset' | 'booking' | 'maintenance_request' | 'transfer_request' | 'audit_item'
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient on notifications(recipient_id, is_read);
create index idx_notifications_created on notifications(created_at desc);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references employee_profiles(id) on delete set null,
  action text not null, -- e.g. 'asset.registered', 'allocation.created', 'booking.cancelled'
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_log_entity on activity_log(entity_type, entity_id);
create index idx_activity_log_created on activity_log(created_at desc);
create index idx_activity_log_actor on activity_log(actor_id);

-- Generic helper any route handler / trigger can call to append a log row + optional notification
create or replace function log_activity(
  p_actor_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer as $$
begin
  insert into activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;
```

---

## 0010_rls_policies.sql

```sql
alter table departments enable row level security;
alter table asset_categories enable row level security;
alter table employee_profiles enable row level security;
alter table assets enable row level security;
alter table allocations enable row level security;
alter table transfer_requests enable row level security;
alter table resource_bookings enable row level security;
alter table maintenance_requests enable row level security;
alter table audit_cycles enable row level security;
alter table audit_items enable row level security;
alter table notifications enable row level security;
alter table activity_log enable row level security;

-- Helper: current user's role + department, used across policies
create or replace function current_employee()
returns employee_profiles language sql stable security definer as $$
  select * from employee_profiles where id = auth.uid();
$$;

-- Everyone authenticated can read master data (departments/categories) — needed for picklists everywhere
create policy "read departments" on departments for select using (auth.role() = 'authenticated');
create policy "read categories" on asset_categories for select using (auth.role() = 'authenticated');
create policy "admin writes departments" on departments for all
  using ((select role from current_employee()) = 'Admin')
  with check ((select role from current_employee()) = 'Admin');
create policy "admin writes categories" on asset_categories for all
  using ((select role from current_employee()) = 'Admin')
  with check ((select role from current_employee()) = 'Admin');

-- Employee profiles: everyone can read directory; only Admin can update role/status
create policy "read employee directory" on employee_profiles for select using (auth.role() = 'authenticated');
create policy "self update own profile" on employee_profiles for update
  using (id = auth.uid() and (select role from current_employee()) <> 'Admin')
  with check (id = auth.uid()); -- non-admins can't change their own role via this policy
create policy "admin manage employees" on employee_profiles for update
  using ((select role from current_employee()) = 'Admin');

-- Assets: everyone can read; Asset Manager/Admin can write
create policy "read assets" on assets for select using (auth.role() = 'authenticated');
create policy "asset manager writes assets" on assets for all
  using ((select role from current_employee()) in ('Admin', 'Asset Manager'))
  with check ((select role from current_employee()) in ('Admin', 'Asset Manager'));

-- Allocations: employees see their own + their department's; managers/heads see all
create policy "read own or dept allocations" on allocations for select
  using (
    employee_id = auth.uid()
    or department_id = (select department_id from current_employee())
    or (select role from current_employee()) in ('Admin', 'Asset Manager', 'Department Head')
  );
create policy "asset manager writes allocations" on allocations for insert
  with check ((select role from current_employee()) in ('Admin', 'Asset Manager'));
create policy "manager or head updates allocations" on allocations for update
  using ((select role from current_employee()) in ('Admin', 'Asset Manager', 'Department Head'));

-- Transfer requests: employees can create for their own allocations; managers/heads approve
create policy "read relevant transfers" on transfer_requests for select
  using (
    from_employee_id = auth.uid() or to_employee_id = auth.uid()
    or (select role from current_employee()) in ('Admin', 'Asset Manager', 'Department Head')
  );
create policy "employee creates transfer" on transfer_requests for insert
  with check (requested_by = auth.uid());
create policy "manager or head approves transfer" on transfer_requests for update
  using ((select role from current_employee()) in ('Admin', 'Asset Manager', 'Department Head'));

-- Bookings: anyone authenticated can read (need visibility to avoid double-booking); own + managers can write
create policy "read all bookings" on resource_bookings for select using (auth.role() = 'authenticated');
create policy "employee creates booking" on resource_bookings for insert
  with check (booked_by = auth.uid());
create policy "owner or manager updates booking" on resource_bookings for update
  using (
    booked_by = auth.uid()
    or (select role from current_employee()) in ('Admin', 'Asset Manager', 'Department Head')
  );

-- Maintenance: employee raises for any asset; asset manager approves/manages
create policy "read maintenance requests" on maintenance_requests for select using (auth.role() = 'authenticated');
create policy "employee raises maintenance" on maintenance_requests for insert
  with check (raised_by = auth.uid());
create policy "manager updates maintenance" on maintenance_requests for update
  using ((select role from current_employee()) in ('Admin', 'Asset Manager'));

-- Audits: admin/asset manager manage cycles; assigned auditors update items
create policy "read audit cycles" on audit_cycles for select using (auth.role() = 'authenticated');
create policy "admin manages audit cycles" on audit_cycles for all
  using ((select role from current_employee()) in ('Admin', 'Asset Manager'));
create policy "read audit items" on audit_items for select using (auth.role() = 'authenticated');
create policy "assigned auditor updates item" on audit_items for update
  using (
    exists (
      select 1 from audit_cycle_auditors aca
      where aca.audit_cycle_id = audit_items.audit_cycle_id and aca.employee_id = auth.uid()
    )
    or (select role from current_employee()) in ('Admin', 'Asset Manager')
  );

-- Notifications: only visible to their recipient
create policy "own notifications only" on notifications for select using (recipient_id = auth.uid());
create policy "own notifications update" on notifications for update using (recipient_id = auth.uid());

-- Activity log: read-only for everyone authenticated (transparency); writes only via security-definer function
create policy "read activity log" on activity_log for select using (auth.role() = 'authenticated');
```

---

## Scheduled jobs (pg_cron) — overdue detection & booking status rollover

Enable the extension (Supabase project settings → Database → Extensions → `pg_cron`, or via SQL if you have the privilege):

```sql
create extension if not exists pg_cron;

-- Every 15 minutes: flag overdue allocations with a notification (idempotent — only notifies once per allocation)
select cron.schedule(
  'flag-overdue-allocations',
  '*/15 * * * *',
  $$
    insert into notifications (recipient_id, type, message, related_entity_type, related_entity_id)
    select a.employee_id, 'Overdue Return Alert',
      'Asset ' || ast.asset_tag || ' is overdue for return', 'allocation', a.id
    from allocations a
    join assets ast on ast.id = a.asset_id
    where a.status = 'Active'
      and a.expected_return_date < current_date
      and not exists (
        select 1 from notifications n
        where n.related_entity_id = a.id and n.type = 'Overdue Return Alert'
      );
  $$
);

-- Every 5 minutes: roll booking status Upcoming -> Ongoing -> Completed based on current time
select cron.schedule(
  'roll-booking-status',
  '*/5 * * * *',
  $$
    update resource_bookings set status = 'Ongoing'
      where status = 'Upcoming' and now() >= starts_at and now() < ends_at;
    update resource_bookings set status = 'Completed'
      where status in ('Upcoming', 'Ongoing') and now() >= ends_at;
  $$
);

-- Daily at 8am: reminder notification for bookings starting within the next hour
select cron.schedule(
  'booking-reminders',
  '0 8 * * *',
  $$
    insert into notifications (recipient_id, type, message, related_entity_type, related_entity_id)
    select booked_by, 'Booking Reminder',
      'Your booking for ' || (select name from assets where id = resource_asset_id) || ' starts soon',
      'booking', id
    from resource_bookings
    where status = 'Upcoming' and starts_at between now() and now() + interval '1 hour';
  $$
);
```

If `pg_cron` isn't available on your Supabase plan/local setup within the hackathon time budget, fall back to computing "overdue" as a query condition directly in the Dashboard/API (`expected_return_date < now() and status = 'Active'`) rather than a stored flag — functionally equivalent for demo purposes, just recalculated on read instead of pre-flagged. Mention this fallback explicitly in your demo if cron isn't wired up.

---

## `supabase/seed.sql` — minimal demo data

```sql
insert into departments (name, status) values ('Engineering', 'Active'), ('Facilities', 'Active'), ('Field Ops', 'Active');
insert into asset_categories (name, extra_fields) values
  ('Electronics', '{"warranty_period_months": 24}'),
  ('Furniture', '{}'),
  ('Vehicles', '{}');
-- Employee rows are created automatically via handle_new_user() on real signup — don't hand-insert auth.users rows.
```

---

## Backend search/sort/filter API implementation pattern

Use this pattern for every list endpoint (assets, allocations, bookings, maintenance, audits). Example for `GET /api/assets`:

```typescript
// src/app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get('q');                 // free-text search (tag/name/serial)
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const department = searchParams.get('department');
  const sortBy = searchParams.get('sortBy') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? true : false;
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), 100); // cap page size

  let query = supabase
    .from('assets')
    .select('id, asset_tag, name, category_id, status, location, department_id', { count: 'exact' });

  if (q) {
    // uses the gin/tsvector index created in 0004_assets.sql
    query = query.textSearch('asset_tag', q, { type: 'websearch', config: 'english' });
  }
  if (category) query = query.eq('category_id', category);
  if (status) query = query.eq('status', status);
  if (department) query = query.eq('department_id', department);

  const allowedSortColumns = ['created_at', 'name', 'status', 'asset_tag'];
  query = query.order(allowedSortColumns.includes(sortBy) ? sortBy : 'created_at', { ascending: sortDir });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ data, count, page, pageSize });
}
```

Notes for this pattern across all list endpoints:
- **Always validate/whitelist `sortBy`** against a known column list — never interpolate the query param directly into `.order()` without checking it first.
- **Always cap `pageSize`** to prevent an accidental full-table fetch.
- Use the same `q / sortBy / sortDir / page / pageSize` param naming across every list endpoint so the frontend can share one `useTableQuery` hook instead of bespoke fetch logic per screen.
- For overlap-sensitive writes (`POST /api/bookings`), catch Postgres error code `23P01` specifically and return a `409 Conflict` with a clear message — this is what powers the inline "slot is unavailable" UI from `2-ui-reference.md`.
- For allocation conflict (`POST /api/allocations`), catch the unique-index violation (`23505` on `uidx_one_active_allocation_per_asset`) and respond with the current holder's info (join to `employee_profiles`) so the frontend can render the "Already Allocated to X" banner — a plain 409 without holder info isn't enough for that UI.

---

## Regenerate types after applying all migrations

```bash
supabase db reset          # applies all 10 migrations + seed.sql fresh
supabase gen types typescript --local > src/types/database.types.ts
```
