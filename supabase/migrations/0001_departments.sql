create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- needed for the booking overlap EXCLUDE constraint

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
