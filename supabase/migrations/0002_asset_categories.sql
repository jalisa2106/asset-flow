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
