create or replace function public.handle_dm_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  recipient_id uuid;
  sender_username text;
begin
  select case 
    when user_a = NEW.sender_id then user_b 
    else user_a 
  end into recipient_id
  from public.dm_conversations
  where id = NEW.conversation_id;

  select username into sender_username
  from public.profiles
  where id = NEW.sender_id;

  if recipient_id is not null and recipient_id != NEW.sender_id then
    insert into public.notifications (user_id, actor_id, type, title, body, link, category, is_read)
    values (
      recipient_id,
      NEW.sender_id,
      'direct_message',
      upper(coalesce(sender_username, 'Someone')) || ' sent you a message!',
      left(coalesce(NEW.body, 'Sent an attachment'), 60),
      '/messages',
      'Activity',
      false
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_dm_message_created on public.dm_messages;
create trigger on_dm_message_created
  after insert on public.dm_messages
  for each row execute function public.handle_dm_notification();