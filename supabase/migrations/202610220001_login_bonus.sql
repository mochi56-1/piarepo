-- Server-owned daily rewards. The client never supplies a date or coin amount.
create table if not exists public.login_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null,
  coins integer not null default 10 check (coins = 10),
  claimed_at timestamptz not null default now(),
  primary key (user_id, reward_date)
);
alter table public.login_rewards enable row level security;
revoke all on public.login_rewards from anon, authenticated;
grant select on public.login_rewards to authenticated;
drop policy if exists login_rewards_read_own on public.login_rewards;
create policy login_rewards_read_own on public.login_rewards
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.get_login_bonus()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  requester uuid := auth.uid();
  tokyo_day date := (now() at time zone 'Asia/Tokyo')::date;
begin
  if requester is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  return jsonb_build_object(
    'day', tokyo_day,
    'claimed_today', exists(select 1 from public.login_rewards where user_id = requester and reward_date = tokyo_day),
    'total', (select coalesce(sum(coins), 0) from public.login_rewards where user_id = requester),
    'next_claim_at', (tokyo_day + 1)::timestamp at time zone 'Asia/Tokyo'
  );
end;
$$;
create or replace function public.claim_login_bonus()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  requester uuid := auth.uid();
  tokyo_day date := (now() at time zone 'Asia/Tokyo')::date;
  inserted_count integer;
begin
  if requester is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  insert into public.login_rewards (user_id, reward_date, coins)
    values (requester, tokyo_day, 10)
    on conflict (user_id, reward_date) do nothing;
  get diagnostics inserted_count = row_count;
  return public.get_login_bonus() || jsonb_build_object('awarded', inserted_count = 1, 'awarded_coins', inserted_count * 10);
end;
$$;
revoke all on function public.get_login_bonus() from public, anon;
revoke all on function public.claim_login_bonus() from public, anon;
grant execute on function public.get_login_bonus() to authenticated;
grant execute on function public.claim_login_bonus() to authenticated;
