-- 분석 결과 캐시 + 매각 알림

-- =========================
-- price_analyses
-- =========================
create table if not exists public.price_analyses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  current_price bigint not null check (current_price >= 0),
  predicted_1m bigint not null check (predicted_1m >= 0),
  predicted_3m bigint not null check (predicted_3m >= 0),
  predicted_6m bigint not null check (predicted_6m >= 0),
  signal text not null check (signal in ('sell_now','review','hold')),
  rationale text not null,
  generated_at timestamptz not null default now()
);

create index if not exists price_analyses_vehicle_generated_idx
  on public.price_analyses (vehicle_id, generated_at desc);

alter table public.price_analyses enable row level security;

drop policy if exists "price_analyses_select_own" on public.price_analyses;
create policy "price_analyses_select_own"
  on public.price_analyses for select
  using (auth.uid() = user_id);

drop policy if exists "price_analyses_insert_own" on public.price_analyses;
create policy "price_analyses_insert_own"
  on public.price_analyses for insert
  with check (auth.uid() = user_id);

-- =========================
-- notifications
-- =========================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  type text not null check (type in ('sell_now','price_drop','price_rise','system')),
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
  on public.notifications for insert
  with check (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id);
