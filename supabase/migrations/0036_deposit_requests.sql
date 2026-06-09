-- 0036: 계좌입금 캐시 충전 — 카드 결제(토스) 심사 전까지 무통장 입금으로 충전.
-- 고객이 입금 신청 → 관리자가 입금 확인 후 승인 → 캐시 지급. 상태를 고객도 볼 수 있다.

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 선택한 충전 패키지 (lib/payments/packages.ts 의 id). 금액·지급캐시는 서버가 이 id로 산정.
  package_id text not null,
  amount_krw integer not null check (amount_krw > 0),
  -- 승인 시 지급될 캐시 (base + bonus)
  credits integer not null check (credits > 0),
  -- 입금자명 — 통장 입금 내역과 대조하기 위함
  depositor_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  -- 반려 사유 등 관리자 메모
  admin_note text,
  -- 승인/반려 처리한 관리자, 처리 시각
  processed_by text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deposit_requests_status_idx
  on public.deposit_requests (status, created_at desc);
create index if not exists deposit_requests_user_idx
  on public.deposit_requests (user_id, created_at desc);

alter table public.deposit_requests enable row level security;

-- 고객은 자기 신청만 조회·생성 가능. 상태 변경(승인/반려)은 서버(admin client)만.
drop policy if exists "deposit_requests_select_own" on public.deposit_requests;
create policy "deposit_requests_select_own" on public.deposit_requests
  for select using (auth.uid() = user_id);

drop policy if exists "deposit_requests_insert_own" on public.deposit_requests;
create policy "deposit_requests_insert_own" on public.deposit_requests
  for insert with check (auth.uid() = user_id and status = 'pending');
