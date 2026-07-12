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
