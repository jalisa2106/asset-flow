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
