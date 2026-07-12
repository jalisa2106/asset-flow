create type notification_type as enum (
  'Asset Assigned', 'Maintenance Approved', 'Maintenance Rejected',
  'Booking Confirmed', 'Booking Cancelled', 'Booking Reminder',
  'Transfer Approved', 'Overdue Return Alert', 'Audit Discrepancy Flagged'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references employee_profiles(id) on delete set null,
  type notification_type not null,
  message text not null,
  related_entity_type text, -- 'asset' | 'booking' | 'maintenance_request' | 'transfer_request' | 'audit_item'
  related_entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_recipient on notifications(recipient_id, is_read);
create index idx_notifications_created on notifications(created_at desc);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references employee_profiles(id) on delete set null,
  action text not null, -- e.g. 'asset.registered', 'allocation.created', 'booking.cancelled'
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_log_entity on activity_log(entity_type, entity_id);
create index idx_activity_log_created on activity_log(created_at desc);
create index idx_activity_log_actor on activity_log(actor_id);

-- Generic helper any route handler / trigger can call to append a log row + optional notification
create or replace function log_activity(
  p_actor_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer as $$
begin
  insert into activity_log (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;
