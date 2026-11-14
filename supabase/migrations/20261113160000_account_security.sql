create table public.account_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  must_change_password boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.account_security enable row level security;

-- A signed-in user may check their own flag, but cannot change it.
grant select on public.account_security to authenticated;

create policy "Users can read their own account security status"
  on public.account_security
  for select to authenticated
  using (user_id = auth.uid());

create table public.admin_password_reset_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  target_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.admin_password_reset_audit enable row level security;

-- No client policies or grants: only trusted server code using the service-role
-- client should read or write this audit table.
revoke all on public.admin_password_reset_audit from anon, authenticated;