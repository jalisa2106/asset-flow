create extension if not exists pg_cron;

-- Every 15 minutes: flag overdue allocations with a notification (idempotent — only notifies once per allocation)
select cron.schedule(
  'flag-overdue-allocations',
  '*/15 * * * *',
  $$
    insert into notifications (recipient_id, type, message, related_entity_type, related_entity_id)
    select a.employee_id, 'Overdue Return Alert',
      'Asset ' || ast.asset_tag || ' is overdue for return', 'allocation', a.id
    from allocations a
    join assets ast on ast.id = a.asset_id
    where a.status = 'Active'
      and a.expected_return_date < current_date
      and not exists (
        select 1 from notifications n
        where n.related_entity_id = a.id and n.type = 'Overdue Return Alert'
      );
  $$
);

-- Every 5 minutes: roll booking status Upcoming -> Ongoing -> Completed based on current time
select cron.schedule(
  'roll-booking-status',
  '*/5 * * * *',
  $$
    update resource_bookings set status = 'Ongoing'
      where status = 'Upcoming' and now() >= starts_at and now() < ends_at;
    update resource_bookings set status = 'Completed'
      where status in ('Upcoming', 'Ongoing') and now() >= ends_at;
  $$
);

-- Daily at 8am: reminder notification for bookings starting within the next hour
select cron.schedule(
  'booking-reminders',
  '0 8 * * *',
  $$
    insert into notifications (recipient_id, type, message, related_entity_type, related_entity_id)
    select booked_by, 'Booking Reminder',
      'Your booking for ' || (select name from assets where id = resource_asset_id) || ' starts soon',
      'booking', id
    from resource_bookings
    where status = 'Upcoming' and starts_at between now() and now() + interval '1 hour';
  $$
);
