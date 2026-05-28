-- 0010: 캐시(크레딧) 시스템 + 차량 status

-- ============================================================
-- 1) user_credits — 사용자별 캐시 잔액
-- ============================================================
create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_member boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;
drop policy if exists "user_credits_select_own" on public.user_credits;
create policy "user_credits_select_own" on public.user_credits
  for select using (auth.uid() = user_id);

-- ============================================================
-- 2) credit_transactions — 캐시 입출금 전체 이력
-- ============================================================
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'signup_bonus', 'charge', 'analysis_overage', 'add_vehicle',
    'monitoring', 'precision_report', 'referral', 'admin_grant',
    'admin_revoke', 'refund'
  )),
  amount integer not null,
  balance_after integer not null,
  description text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;
drop policy if exists "credit_transactions_select_own" on public.credit_transactions;
create policy "credit_transactions_select_own" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- ============================================================
-- 3) payments — 결제 이력 (Stage 2 토스 연동용 미리 만듦)
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_krw integer not null check (amount_krw > 0),
  credits_granted integer not null check (credits_granted > 0),
  provider text not null default 'toss',
  provider_payment_key text,
  provider_order_id text not null unique,
  status text not null check (status in ('pending', 'paid', 'failed', 'canceled')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.payments enable row level security;
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);
drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 4) vehicles 에 status / sold_at 컬럼 추가
-- ============================================================
alter table public.vehicles
  add column if not exists status text not null default 'active'
    check (status in ('active', 'sold', 'deleted')),
  add column if not exists sold_at timestamptz;

create index if not exists vehicles_user_status_idx
  on public.vehicles (user_id, status);

-- ============================================================
-- 5) 신규 가입 시 자동으로 user_credits + 보너스 3,000 캐시
-- ============================================================
create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_credits (user_id, balance)
  values (new.id, 3000)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (
    user_id, type, amount, balance_after, description
  )
  values (new.id, 'signup_bonus', 3000, 3000, '신규 가입 보너스 3,000 캐시');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_credits on auth.users;
create trigger on_auth_user_created_credits
  after insert on auth.users
  for each row execute function public.handle_new_user_credits();

-- ============================================================
-- 6) 기존 사용자에게 소급 보너스 (있다면)
-- ============================================================
insert into public.user_credits (user_id, balance)
select id, 3000 from auth.users
on conflict (user_id) do nothing;

insert into public.credit_transactions (user_id, type, amount, balance_after, description)
select u.id, 'signup_bonus', 3000, 3000, '기존 사용자 소급 보너스 3,000 캐시'
from auth.users u
where not exists (
  select 1 from public.credit_transactions ct
  where ct.user_id = u.id and ct.type = 'signup_bonus'
);

-- ============================================================
-- 7) SECURITY DEFINER 함수 — 원자적 캐시 사용/지급
-- ============================================================
create or replace function public.spend_credits(
  p_amount integer,
  p_type text,
  p_description text default null,
  p_ref_id uuid default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_new_balance integer;
  v_is_lifetime boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  select lifetime_member into v_is_lifetime
  from public.user_credits where user_id = v_user_id;

  if v_is_lifetime then
    -- 평생회원: 잔액 차감 없이 기록만
    select balance into v_new_balance
    from public.user_credits where user_id = v_user_id;
    insert into public.credit_transactions (
      user_id, type, amount, balance_after, description, ref_id
    ) values (
      v_user_id, p_type, 0, v_new_balance,
      coalesce(p_description, '') || ' (평생회원 무료)', p_ref_id
    );
    return v_new_balance;
  end if;

  update public.user_credits
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = v_user_id
    and balance >= p_amount
  returning balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'insufficient_credits';
  end if;

  insert into public.credit_transactions (
    user_id, type, amount, balance_after, description, ref_id
  ) values (
    v_user_id, p_type, -p_amount, v_new_balance, p_description, p_ref_id
  );

  return v_new_balance;
end;
$$;

grant execute on function public.spend_credits to authenticated, service_role;
