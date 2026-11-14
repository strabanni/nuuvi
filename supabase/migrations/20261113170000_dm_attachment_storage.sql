-- Make sure the bucket is private. This affects access through public URLs.
update storage.buckets
set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
where id = 'dm-attachments';

create policy "DM participants can view attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'dm-attachments'
  and exists (
    select 1
    from public.dm_conversations c
    where c.id::text = (storage.foldername(name))[1]
      and auth.uid() in (c.user_a, c.user_b)
  )
);

create policy "Participants can upload their own DM attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dm-attachments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
    from public.dm_conversations c
    where c.id::text = (storage.foldername(name))[1]
      and auth.uid() in (c.user_a, c.user_b)
  )
);

create policy "Users can delete their own DM attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dm-attachments'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
    from public.dm_conversations c
    where c.id::text = (storage.foldername(name))[1]
      and auth.uid() in (c.user_a, c.user_b)
  )
);