create or replace function report_utilization_by_department(p_from date, p_to date)
returns table(department_id uuid, department_name text, active_count bigint, total_count bigint)
language sql stable as $$
  select d.id, d.name,
    count(*) filter (where a.status = 'Active') as active_count,
    count(*) as total_count
  from departments d
  left join allocations a on a.department_id = d.id
    and a.allocated_at::date between p_from and p_to
  group by d.id, d.name
  order by active_count desc;
$$;

create or replace function report_maintenance_frequency(p_from date, p_to date)
returns table(asset_id uuid, asset_tag text, asset_name text, request_count bigint, avg_resolution_hours numeric)
language sql stable as $$
  select a.id, a.asset_tag, a.name,
    count(m.id) as request_count,
    avg(extract(epoch from (m.resolved_at - m.created_at)) / 3600) filter (where m.resolved_at is not null) as avg_resolution_hours
  from assets a
  join maintenance_requests m on m.asset_id = a.id
  where m.created_at::date between p_from and p_to
  group by a.id, a.asset_tag, a.name
  order by request_count desc;
$$;

create or replace function report_booking_heatmap(p_from date, p_to date)
returns table(resource_asset_id uuid, resource_name text, hour_bucket int, booking_count bigint)
language sql stable as $$
  select b.resource_asset_id, a.name, extract(hour from b.starts_at)::int as hour_bucket,
    count(*) as booking_count
  from resource_bookings b
  join assets a on a.id = b.resource_asset_id
  where b.starts_at::date between p_from and p_to
  group by b.resource_asset_id, a.name, extract(hour from b.starts_at)
  order by resource_asset_id, hour_bucket;
$$;

create or replace function report_due_for_attention()
returns table(asset_id uuid, asset_tag text, asset_name text, reason text, detail text)
language sql stable as $$
  select id, asset_tag, name, 'nearing_retirement',
    'Acquired ' || acquisition_date::text
  from assets
  where acquisition_date < now() - interval '4 years' and status not in ('Retired', 'Disposed')
  union all
  select a.id, a.asset_tag, a.name, 'overdue_maintenance_check',
    'Last request: ' || max(m.created_at)::text
  from assets a
  join maintenance_requests m on m.asset_id = a.id
  group by a.id, a.asset_tag, a.name
  having max(m.created_at) < now() - interval '6 months';
$$;
