-- All journal content remains private, even if its legacy UI flag is "public".
create table if not exists public.account_records (
 user_id uuid primary key references auth.users(id) on delete cascade,
 document jsonb not null default '{"notes":[],"planner":{"tasks":[],"events":[]}}',
 revision integer not null default 0,
 updated_at timestamptz not null default now(),
 check (jsonb_typeof(document->'notes') = 'array' and jsonb_typeof(document->'planner'->'tasks') = 'array' and jsonb_typeof(document->'planner'->'events') = 'array'),
 check (octet_length(document::text) <= 30000000)
);
alter table public.account_records enable row level security;
revoke all on public.account_records from anon, authenticated;
grant select on public.account_records to authenticated;
drop policy if exists records_own on public.account_records;
create policy records_own on public.account_records for select to authenticated using ((select auth.uid())=user_id);
create or replace function public.save_account_records(payload jsonb, expected_revision integer)
returns integer language plpgsql security definer set search_path='' as $$
declare next_revision integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if payload is null or not (payload ? 'notes' and payload ? 'planner') or
 jsonb_typeof(payload->'notes') is distinct from 'array' or
 jsonb_typeof(payload->'planner'->'tasks') is distinct from 'array' or
 jsonb_typeof(payload->'planner'->'events') is distinct from 'array' then raise exception 'Invalid document'; end if;
 insert into public.account_records(user_id) values(auth.uid()) on conflict do nothing;
 update public.account_records set document=payload, revision=revision+1, updated_at=now()
 where user_id=auth.uid() and revision=expected_revision returning revision into next_revision;
 if next_revision is null then raise exception 'RECORD_CONFLICT' using errcode='40001'; end if;
 return next_revision;
end; $$;

create table if not exists public.friend_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'ぴあれぽユーザー' check(length(trim(display_name)) between 1 and 30),
 invite_token uuid not null unique default gen_random_uuid()
);
create table if not exists public.friend_connections (
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references public.friend_profiles(user_id) on delete cascade,
 recipient uuid not null references public.friend_profiles(user_id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(requester<>recipient)
);
create unique index if not exists friend_pair_unique on public.friend_connections(least(requester,recipient),greatest(requester,recipient));
alter table public.friend_profiles enable row level security;
alter table public.friend_connections enable row level security;
revoke all on public.friend_profiles, public.friend_connections from anon,authenticated;
grant select on public.friend_profiles, public.friend_connections to authenticated;
drop policy if exists profiles_own on public.friend_profiles;
create policy profiles_own on public.friend_profiles for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists connections_own on public.friend_connections;
create policy connections_own on public.friend_connections for select to authenticated using ((select auth.uid()) in (requester,recipient));

create or replace function public.friend_home()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.friend_profiles(user_id) values(auth.uid()) on conflict do nothing;
 return jsonb_build_object('profile',(select jsonb_build_object('display_name',display_name,'invite_token',invite_token) from public.friend_profiles where user_id=auth.uid()),
 'connections',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'incoming',c.recipient=auth.uid(),'name',p.display_name)) from public.friend_connections c join public.friend_profiles p on p.user_id=case when c.requester=auth.uid() then c.recipient else c.requester end where auth.uid() in(c.requester,c.recipient)),'[]'::jsonb));
end; $$;
create or replace function public.update_friend_profile(new_name text, rotate boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.friend_profiles(user_id,display_name) values(auth.uid(),trim(new_name)) on conflict(user_id) do update set display_name=excluded.display_name,invite_token=case when rotate then gen_random_uuid() else public.friend_profiles.invite_token end;
end; $$;
create or replace function public.preview_friend_invite(token uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return (select display_name from public.friend_profiles where invite_token=token and user_id<>auth.uid());
end; $$;
create or replace function public.request_friend(token uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select user_id into target from public.friend_profiles where invite_token=token;
 if target is null or target=auth.uid() then raise exception 'Invalid invitation'; end if;
 insert into public.friend_profiles(user_id) values(auth.uid()) on conflict do nothing;
 insert into public.friend_connections(requester,recipient) values(auth.uid(),target) on conflict do nothing;
end; $$;
create or replace function public.respond_friend(connection_id uuid, accept boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if accept then
 update public.friend_connections set status='accepted' where id=connection_id and recipient=auth.uid() and status='pending';
 else
 delete from public.friend_connections where id=connection_id and auth.uid() in(requester,recipient);
 end if;
end; $$;
revoke all on function public.save_account_records(jsonb,integer),public.friend_home(),public.update_friend_profile(text,boolean),public.preview_friend_invite(uuid),public.request_friend(uuid),public.respond_friend(uuid,boolean) from public,anon;
grant execute on function public.save_account_records(jsonb,integer),public.friend_home(),public.update_friend_profile(text,boolean),public.preview_friend_invite(uuid),public.request_friend(uuid),public.respond_friend(uuid,boolean) to authenticated;
