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
