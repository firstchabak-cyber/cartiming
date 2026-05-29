-- 0021: 친구 추천 보상 — 추천 링크로 가입한 친구가 첫 분석을 하면 추천인에게 캐시 지급.

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  -- 추천받아 가입한 친구. 한 명은 평생 한 번만 추천 대상이 됨.
  referred_id uuid not null references auth.users(id) on delete cascade unique,
  status text not null default 'rewarded' check (status in ('pending', 'rewarded')),
  reward_amount integer not null default 0,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  -- 본인이 본인을 추천하는 것 차단
  constraint referrals_no_self check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id, created_at desc);

alter table public.referrals enable row level security;

-- 추천인은 자기가 추천한 내역 조회 가능
drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
-- 쓰기는 서버(admin client)만 — 정책 없음 = 일반 사용자 insert/update 불가
