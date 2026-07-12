create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address text,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index idx_login_attempts_email_time on login_attempts(email, created_at desc);

-- Returns true if this email has 5+ failed attempts in the last 15 minutes (lockout window).
create or replace function is_login_locked_out(p_email text)
returns boolean language sql stable as $$
  select count(*) >= 5
  from login_attempts
  where email = p_email
    and success = false
    and created_at > now() - interval '15 minutes';
$$;
