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
