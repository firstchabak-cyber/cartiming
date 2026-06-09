-- 0037: 시세분석 후기 게시판 — 고객이 자기 차 시세분석 후기를 공유(사회적 증거).
-- 개인정보(차량번호 등)는 절대 저장하지 않는다. 관리자 승인 후 공개 + 차량 1대당 200캐시 1회.

create table if not exists public.analysis_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  -- 표시용 닉네임 (작성 시점의 프로필 이름 스냅샷, 개인 식별 불가하게 마스킹해 노출)
  nickname text not null,
  -- 차량 요약 스냅샷 — 번호판·차대번호 등 개인정보는 포함하지 않음
  manufacturer text not null,
  model text not null,
  trim text,
  year integer not null,
  mileage integer not null,
  current_price integer not null,
  signal text not null check (signal in ('sell_now', 'review', 'hold')),
  review_text text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'hidden')),
  -- 이 후기로 캐시를 지급했는지 (차량당 1회 지급 보장용)
  rewarded boolean not null default false,
  admin_note text,
  processed_by text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists analysis_reviews_status_created_idx
  on public.analysis_reviews (status, created_at desc);
create index if not exists analysis_reviews_user_idx
  on public.analysis_reviews (user_id, created_at desc);
-- 차량 1대당 활성(반려 아닌) 후기는 1건만 — 도배 방지 + "1대당 1번" 규칙
create unique index if not exists analysis_reviews_one_per_vehicle
  on public.analysis_reviews (vehicle_id)
  where status <> 'rejected';

alter table public.analysis_reviews enable row level security;

-- 공개된(approved) 후기는 로그인 사용자 누구나 조회 + 본인 후기는 상태 무관 조회.
drop policy if exists "analysis_reviews_select" on public.analysis_reviews;
create policy "analysis_reviews_select" on public.analysis_reviews
  for select using (status = 'approved' or auth.uid() = user_id);

-- 본인 차량 후기만 작성 가능 (대기 상태로). 승인·반려는 서버(admin client)만.
drop policy if exists "analysis_reviews_insert_own" on public.analysis_reviews;
create policy "analysis_reviews_insert_own" on public.analysis_reviews
  for insert with check (auth.uid() = user_id and status = 'pending');

-- 캐시 원장에 'review'(후기 보상) 유형 추가
alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions
  add constraint credit_transactions_type_check check (type in (
    'signup_bonus', 'charge', 'analysis_overage', 'add_vehicle',
    'monitoring', 'precision_report', 'referral', 'admin_grant',
    'admin_revoke', 'refund', 'review'
  ));
