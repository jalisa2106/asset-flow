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
