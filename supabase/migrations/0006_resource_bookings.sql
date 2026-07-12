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
