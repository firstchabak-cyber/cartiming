-- 0024: 웹 푸시(PWA) 구독 정보 + 이메일 알림 수신 설정.

-- 브라우저/기기별 푸시 구독 정보
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- 본인 구독만 조회/삭제 (insert/update 는 서버 admin client 로 처리)
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- 이메일 알림 수신 여부 (기본 ON). user_credits 에 컬럼 추가.
alter table public.user_credits
  add column if not exists email_notifications boolean not null default true;
