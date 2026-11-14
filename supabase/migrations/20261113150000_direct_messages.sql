create table public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint dm_conversations_distinct_users check (user_a <> user_b),
  constraint dm_conversations_canonical_order check (user_a < user_b),
  constraint dm_conversations_pair_unique unique (user_a, user_b)
);

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  media jsonb not null default '[]'::jsonb
    check (jsonb_typeof(media) = 'array'),
  reply_to uuid references public.dm_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,

  constraint dm_messages_has_content
    check (length(trim(body)) > 0 or jsonb_array_length(media) > 0)
);

create index dm_messages_conversation_created_idx
  on public.dm_messages (conversation_id, created_at desc);

create table public.dm_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.dm_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null
    check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),

  constraint dm_reactions_unique unique (message_id, user_id, emoji)
);

create index dm_reactions_message_idx
  on public.dm_reactions (message_id);

create table public.dm_reads (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),

  primary key (conversation_id, user_id)
);

-- Used by policies to check membership without recursively querying
-- dm_conversations under its own RLS policies.
create or replace function public.is_dm_participant(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dm_conversations c
    where c.id = _conversation_id
      and auth.uid() in (c.user_a, c.user_b)
  );
$$;

revoke all on function public.is_dm_participant(uuid) from public;
grant execute on function public.is_dm_participant(uuid) to authenticated;

alter table public.dm_conversations enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_reactions enable row level security;
alter table public.dm_reads enable row level security;

create policy "DM participants can read conversations"
  on public.dm_conversations
  for select to authenticated
  using (auth.uid() in (user_a, user_b));

-- Conversation creation must go through get_or_create_dm below.
-- There are deliberately no client INSERT, UPDATE or DELETE policies
-- on dm_conversations.

create policy "DM participants can read messages"
  on public.dm_messages
  for select to authenticated
  using (public.is_dm_participant(conversation_id));

create policy "DM participants can send as themselves"
  on public.dm_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_dm_participant(conversation_id)
  );

create policy "Senders can edit their own messages"
  on public.dm_messages
  for update to authenticated
  using (
    sender_id = auth.uid()
    and public.is_dm_participant(conversation_id)
  )
  with check (
    sender_id = auth.uid()
    and public.is_dm_participant(conversation_id)
  );

create policy "Senders can delete their own messages"
  on public.dm_messages
  for delete to authenticated
  using (
    sender_id = auth.uid()
    and public.is_dm_participant(conversation_id)
  );

create policy "DM participants can read reactions"
  on public.dm_reactions
  for select to authenticated
  using (
    exists (
      select 1
      from public.dm_messages m
      where m.id = message_id
        and public.is_dm_participant(m.conversation_id)
    )
  );

create policy "Users can add their own reactions"
  on public.dm_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.dm_messages m
      where m.id = message_id
        and public.is_dm_participant(m.conversation_id)
    )
  );

create policy "Users can remove their own reactions"
  on public.dm_reactions
  for delete to authenticated
  using (user_id = auth.uid());

-- Participants can see receipts; each person can change only their own.
create policy "DM participants can read read markers"
  on public.dm_reads
  for select to authenticated
  using (public.is_dm_participant(conversation_id));

create policy "Users can create their own read marker"
  on public.dm_reads
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_dm_participant(conversation_id)
  );

create policy "Users can update their own read marker"
  on public.dm_reads
  for update to authenticated
  using (
    user_id = auth.uid()
    and public.is_dm_participant(conversation_id)
  )
  with check (
    user_id = auth.uid()
    and public.is_dm_participant(conversation_id)
  );

-- Find or create the unique one-to-one conversation for the signed-in user and another user.
create or replace function public.get_or_create_dm(_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _me uuid := auth.uid();
  _a uuid;
  _b uuid;
  _conversation_id uuid;
begin
  if _me is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if _other_user_id is null or _other_user_id = _me then
    raise exception 'Choose another user' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = _other_user_id
  ) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  _a := least(_me, _other_user_id);
  _b := greatest(_me, _other_user_id);

  insert into public.dm_conversations (user_a, user_b)
  values (_a, _b)
  on conflict (user_a, user_b) do nothing;

  select c.id into _conversation_id
  from public.dm_conversations c
  where c.user_a = _a and c.user_b = _b;

  return _conversation_id;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- Keep the conversation at the top of the list when a new message arrives.
create or replace function public.bump_dm_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.dm_conversations
  set last_message_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

create trigger dm_message_insert_bumps_conversation
  after insert on public.dm_messages
  for each row
  execute function public.bump_dm_conversation();

-- Supabase projects commonly grant these through default privileges, but make
-- the required client access explicit. RLS still controls which rows are allowed.
grant select on public.dm_conversations to authenticated;
grant select, insert, update, delete on public.dm_messages to authenticated;
grant select, insert, delete on public.dm_reactions to authenticated;
grant select, insert, update on public.dm_reads to authenticated;
grant execute on function public.get_or_create_dm(uuid) to authenticated;