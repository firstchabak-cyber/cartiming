-- 0020: 딜러 역경매 — 딜러가 구하는 차량을 등록(구매요청)하고,
--        관리자 승인 후 조건이 맞는 차주에게 알림 + 공개 게시판 노출.

create table if not exists public.dealer_wanted (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references auth.users(id) on delete cascade,
  dealer_name text not null,                 -- 등록 시점 상호 스냅샷
  -- 구하는 차량 조건
  manufacturer text not null,                -- 제조사 (예: 현대)
  model text not null,                       -- 모델 (예: 그랜저)
  year_min smallint check (year_min is null or year_min between 1900 and 2100),
  year_max smallint check (year_max is null or year_max between 1900 and 2100),
  max_mileage integer check (max_mileage is null or max_mileage >= 0),  -- 주행 상한 (km)
  max_price bigint check (max_price is null or max_price > 0),          -- 매입 희망 상한가 (원)
  region text,                               -- 희망 지역
  memo text,                                 -- 추가 메모
  -- 구하는 기간 (null = 상시)
  expires_at timestamptz,
  -- 상태
  status text not null default 'pending' check (status in
    ('pending', 'approved', 'rejected', 'expired', 'closed')),
  reject_reason text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists dealer_wanted_dealer_idx
  on public.dealer_wanted (dealer_id, created_at desc);
create index if not exists dealer_wanted_status_idx
  on public.dealer_wanted (status, created_at desc);
-- 차주 매칭용 (제조사+모델)
create index if not exists dealer_wanted_match_idx
  on public.dealer_wanted (manufacturer, model, status);

alter table public.dealer_wanted enable row level security;

-- 딜러는 본인 구매요청 조회
drop policy if exists "dealer_wanted_select_own" on public.dealer_wanted;
create policy "dealer_wanted_select_own" on public.dealer_wanted
  for select using (auth.uid() = dealer_id);

-- 승인+유효(만료 전)한 구매요청은 모든 로그인 사용자(차주)가 조회 가능 — 공개 게시판
drop policy if exists "dealer_wanted_select_public" on public.dealer_wanted;
create policy "dealer_wanted_select_public" on public.dealer_wanted
  for select using (
    status = 'approved'
    and (expires_at is null or expires_at > now())
  );

-- 딜러는 본인 명의로 구매요청 등록
drop policy if exists "dealer_wanted_insert_own" on public.dealer_wanted;
create policy "dealer_wanted_insert_own" on public.dealer_wanted
  for insert with check (auth.uid() = dealer_id);

-- 딜러는 본인 구매요청 수정(마감 등)
drop policy if exists "dealer_wanted_update_own" on public.dealer_wanted;
create policy "dealer_wanted_update_own" on public.dealer_wanted
  for update using (auth.uid() = dealer_id);
