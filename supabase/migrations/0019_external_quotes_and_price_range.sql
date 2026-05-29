-- 0019: 외부 견적(헤이딜러·케이카·엔카 등) 입력 + 시세 신뢰 구간

-- 1) 차량별 외부 견적 (사용자가 직접 입력)
create table if not exists public.vehicle_external_quotes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in
    ('heydealer', 'kcar', 'cazza', 'encar', 'kb_chacha', 'other')),
  source_label text, -- 'other' 일 때 자유 입력
  quoted_price bigint not null check (quoted_price > 0),
  quoted_at date not null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists vehicle_external_quotes_vehicle_idx
  on public.vehicle_external_quotes (vehicle_id, quoted_at desc);
create index if not exists vehicle_external_quotes_user_idx
  on public.vehicle_external_quotes (user_id, created_at desc);

alter table public.vehicle_external_quotes enable row level security;

drop policy if exists "vehicle_external_quotes_select_own"
  on public.vehicle_external_quotes;
create policy "vehicle_external_quotes_select_own"
  on public.vehicle_external_quotes for select
  using (auth.uid() = user_id);

drop policy if exists "vehicle_external_quotes_insert_own"
  on public.vehicle_external_quotes;
create policy "vehicle_external_quotes_insert_own"
  on public.vehicle_external_quotes for insert
  with check (auth.uid() = user_id);

drop policy if exists "vehicle_external_quotes_update_own"
  on public.vehicle_external_quotes;
create policy "vehicle_external_quotes_update_own"
  on public.vehicle_external_quotes for update
  using (auth.uid() = user_id);

drop policy if exists "vehicle_external_quotes_delete_own"
  on public.vehicle_external_quotes;
create policy "vehicle_external_quotes_delete_own"
  on public.vehicle_external_quotes for delete
  using (auth.uid() = user_id);

-- 2) price_analyses 에 신뢰 구간 컬럼 추가
alter table public.price_analyses
  add column if not exists current_price_min bigint check (current_price_min is null or current_price_min > 0),
  add column if not exists current_price_max bigint check (current_price_max is null or current_price_max > 0);
