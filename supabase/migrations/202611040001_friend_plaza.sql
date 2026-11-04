-- Explicit opt-in only. Legacy visibility='public' does NOT publish a note.
create table if not exists public.friend_notes (
 owner_id uuid not null references auth.users(id) on delete cascade,
 note_id text not null,
 content jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(owner_id,note_id)
);
create table if not exists public.friend_stamps (
 owner_id uuid not null, note_id text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 stamp text not null check(stamp in ('seen','hug','tea','heart','empathy','thanks','cheer','rest','flower','clap','warm','celebrate','listen')),
 primary key(owner_id,note_id,user_id,stamp),
 foreign key(owner_id,note_id) references public.friend_notes(owner_id,note_id) on delete cascade
);
create table if not exists public.friend_comments (
 id uuid primary key,
 owner_id uuid not null, note_id text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now(),
 foreign key(owner_id,note_id) references public.friend_notes(owner_id,note_id) on delete cascade
);
create index if not exists friend_comments_note on public.friend_comments(owner_id,note_id,created_at);
alter table public.friend_notes enable row level security;
alter table public.friend_stamps enable row level security;
alter table public.friend_comments enable row level security;
revoke all on public.friend_notes,public.friend_stamps,public.friend_comments from anon,authenticated;
grant select on public.friend_notes,public.friend_stamps,public.friend_comments to authenticated;

create or replace function public.can_read_friend_note(note_owner uuid,target_note text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
 select 1 from public.friend_notes n where n.owner_id=note_owner and n.note_id=target_note
 and (note_owner=auth.uid() or exists(select 1 from public.friend_connections c where c.status='accepted'
 and ((c.requester=auth.uid() and c.recipient=note_owner) or (c.recipient=auth.uid() and c.requester=note_owner)))))
$$;
drop policy if exists friend_notes_read on public.friend_notes;
create policy friend_notes_read on public.friend_notes for select to authenticated using(public.can_read_friend_note(owner_id,note_id));
drop policy if exists friend_stamps_read on public.friend_stamps;
create policy friend_stamps_read on public.friend_stamps for select to authenticated using(public.can_read_friend_note(owner_id,note_id));
drop policy if exists friend_comments_read on public.friend_comments;
create policy friend_comments_read on public.friend_comments for select to authenticated using(public.can_read_friend_note(owner_id,note_id));

create or replace function public.sync_friend_notes()
returns trigger language plpgsql security definer set search_path='' as $$
declare entry jsonb; safe jsonb;
begin
 delete from public.friend_notes n where n.owner_id=new.user_id and not exists(
 select 1 from jsonb_array_elements(new.document->'notes') e
 where e->'shareToFriends'='true'::jsonb and e->>'id'=n.note_id);
 for entry in select e from jsonb_array_elements(new.document->'notes') e where e->'shareToFriends'='true'::jsonb loop
  if jsonb_typeof(entry->'id') is distinct from 'number' or jsonb_typeof(entry->'body') is distinct from 'string'
  or jsonb_typeof(entry->'title') is distinct from 'string' or coalesce(entry->>'mood','') !~ '^[1-5]$'
  then raise exception 'Invalid shared note'; end if;
  safe=jsonb_build_object('title',entry->>'title','body',entry->>'body','date',entry->>'date','time',entry->>'time',
   'mood',(entry->>'mood')::integer,'feeling',case when entry->>'feeling' in ('最高','いい感じ！','いいかも','まあまあ','びみょう','ダメかも','無理') then entry->>'feeling' else null end,
   'image',case when entry->>'image' ~ '^data:image/(png|jpeg|gif|webp);base64,' then entry->>'image' else '' end);
  insert into public.friend_notes(owner_id,note_id,content) values(new.user_id,entry->>'id',safe)
  on conflict(owner_id,note_id) do update set content=excluded.content,updated_at=now()
  where public.friend_notes.content is distinct from excluded.content;
 end loop;
 return new;
end; $$;
drop trigger if exists sync_friend_notes on public.account_records;
create trigger sync_friend_notes after insert or update of document on public.account_records for each row execute function public.sync_friend_notes();
-- Deliberately do not backfill: previously "public" demo notes stay private.

create or replace function public.friend_plaza(page_number integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare offset_count integer; result jsonb; more boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if page_number is null or page_number<0 or page_number>10000 then raise exception 'Invalid page'; end if;
 offset_count=page_number*10;
 select count(*)>offset_count+10 into more from public.friend_notes n where public.can_read_friend_note(n.owner_id,n.note_id);
 select coalesce(jsonb_agg(item order by updated_at desc,owner_id,note_id),'[]'::jsonb) into result from (
 select n.updated_at,n.owner_id,n.note_id,jsonb_build_object(
 'owner',n.owner_id,'id',n.note_id,'name',coalesce(p.display_name,'ぴあれぽユーザー'),'own',n.owner_id=auth.uid(),'content',n.content,
 'stamps',coalesce((select jsonb_object_agg(stamp,total) from(select s.stamp,count(*) as total from public.friend_stamps s where s.owner_id=n.owner_id and s.note_id=n.note_id group by s.stamp) counts),'{}'::jsonb),
 'myStamps',coalesce((select jsonb_object_agg(s.stamp,true) from public.friend_stamps s where s.owner_id=n.owner_id and s.note_id=n.note_id and s.user_id=auth.uid()),'{}'::jsonb),
 'commentCount',(select count(*) from public.friend_comments c where c.owner_id=n.owner_id and c.note_id=n.note_id),
 'comments',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'text',c.body,'author',coalesce(cp.display_name,'ぴあれぽユーザー'),'createdAt',c.created_at,'canDelete',c.user_id=auth.uid() or n.owner_id=auth.uid()) order by c.created_at,c.id)
 from (select * from public.friend_comments cc where cc.owner_id=n.owner_id and cc.note_id=n.note_id order by cc.created_at desc,cc.id desc limit 50) c left join public.friend_profiles cp on cp.user_id=c.user_id),'[]'::jsonb)) as item
 from public.friend_notes n left join public.friend_profiles p on p.user_id=n.owner_id
 where public.can_read_friend_note(n.owner_id,n.note_id) order by n.updated_at desc,n.owner_id,n.note_id limit 10 offset offset_count
 ) notes;
 return jsonb_build_object('items',result,'hasMore',more);
end; $$;
create or replace function public.set_friend_stamp(note_owner uuid,target_note text,stamp_key text,active boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.can_read_friend_note(note_owner,target_note) then raise exception 'Note unavailable' using errcode='42501'; end if;
 -- Lock the note while writing: unsharing/deleting cannot interleave a new reaction.
 perform 1 from public.friend_notes where owner_id=note_owner and note_id=target_note for key share;
 if not found then raise exception 'Note unavailable' using errcode='42501'; end if;
 if note_owner<>auth.uid() then
  perform 1 from public.friend_connections c where c.status='accepted'
   and ((c.requester=auth.uid() and c.recipient=note_owner) or (c.recipient=auth.uid() and c.requester=note_owner)) for share;
  if not found then raise exception 'Note unavailable' using errcode='42501'; end if;
 end if;
 if active is null then raise exception 'Invalid reaction'; end if;
 if active then insert into public.friend_stamps values(note_owner,target_note,auth.uid(),stamp_key) on conflict do nothing;
 else delete from public.friend_stamps where owner_id=note_owner and note_id=target_note and user_id=auth.uid() and stamp=stamp_key; end if;
end; $$;
create or replace function public.add_friend_comment(note_owner uuid,target_note text,comment_body text,request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.can_read_friend_note(note_owner,target_note) then raise exception 'Note unavailable' using errcode='42501'; end if;
 perform 1 from public.friend_notes where owner_id=note_owner and note_id=target_note for key share;
 if not found then raise exception 'Note unavailable' using errcode='42501'; end if;
 if note_owner<>auth.uid() then
  perform 1 from public.friend_connections c where c.status='accepted'
   and ((c.requester=auth.uid() and c.recipient=note_owner) or (c.recipient=auth.uid() and c.requester=note_owner)) for share;
  if not found then raise exception 'Note unavailable' using errcode='42501'; end if;
 end if;
 insert into public.friend_comments(id,owner_id,note_id,user_id,body) values(request_id,note_owner,target_note,auth.uid(),trim(comment_body)) on conflict(id) do nothing;
 if not exists(select 1 from public.friend_comments where id=request_id and owner_id=note_owner and note_id=target_note and user_id=auth.uid() and body=trim(comment_body)) then raise exception 'Request conflict'; end if;
end; $$;
create or replace function public.delete_friend_comment(comment_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 delete from public.friend_comments where id=comment_id and (user_id=auth.uid() or owner_id=auth.uid());
end; $$;
create or replace function public.friend_sharing_ready()
returns integer language sql stable set search_path='' as $$ select 1 $$;
revoke all on function public.sync_friend_notes() from public,anon,authenticated;
revoke all on function public.can_read_friend_note(uuid,text),public.friend_plaza(integer),public.set_friend_stamp(uuid,text,text,boolean),public.add_friend_comment(uuid,text,text,uuid),public.delete_friend_comment(uuid),public.friend_sharing_ready() from public,anon;
grant execute on function public.can_read_friend_note(uuid,text),public.friend_plaza(integer),public.set_friend_stamp(uuid,text,text,boolean),public.add_friend_comment(uuid,text,text,uuid),public.delete_friend_comment(uuid),public.friend_sharing_ready() to authenticated;
notify pgrst,'reload schema';
