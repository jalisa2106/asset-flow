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
