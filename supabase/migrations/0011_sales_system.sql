-- 0011: 매각 신청·입찰·실거래 + 딜러 + 영구 슬롯

-- ============================================================
-- 1) sale_requests — 카타이밍 통한 매각 신청
-- ============================================================
create table if not exists public.sale_requests (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in
    ('pending', 'bidding', 'matched', 'completed', 'canceled')),
  current_mileage integer check (current_mileage is null or current_mileage >= 0),
  contact_phone text,
  contact_kakao text,
  sale_timing text check (sale_timing is null or sale_timing in
    ('immediate', 'within_week', 'within_month', 'undecided')),
  sale_reason text,
  additional_notes text,
  selected_bid_id uuid,
  bidding_closes_at timestamptz,
  matched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sale_requests_user_idx
  on public.sale_requests (user_id, created_at desc);
create index if not exists sale_requests_status_idx
  on public.sale_requests (status, created_at desc);

alter table public.sale_requests enable row level security;
drop policy if exists "sale_requests_select_own" on public.sale_requests;
create policy "sale_requests_select_own" on public.sale_requests
  for select using (auth.uid() = user_id);
drop policy if exists "sale_requests_insert_own" on public.sale_requests;
create policy "sale_requests_insert_own" on public.sale_requests
  for insert with check (auth.uid() = user_id);
drop policy if exists "sale_requests_update_own" on public.sale_requests;
create policy "sale_requests_update_own" on public.sale_requests
  for update using (auth.uid() = user_id);

-- ============================================================
-- 2) sale_photos — 매각 신청 첨부 사진
-- ============================================================
create table if not exists public.sale_photos (
  id uuid primary key default gen_random_uuid(),
  sale_request_id uuid not null references public.sale_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sale_photos_request_idx
  on public.sale_photos (sale_request_id, sort_order);

alter table public.sale_photos enable row level security;
drop policy if exists "sale_photos_select_own" on public.sale_photos;
create policy "sale_photos_select_own" on public.sale_photos
  for select using (auth.uid() = user_id);
drop policy if exists "sale_photos_insert_own" on public.sale_photos;
create policy "sale_photos_insert_own" on public.sale_photos
  for insert with check (auth.uid() = user_id);
drop policy if exists "sale_photos_delete_own" on public.sale_photos;
create policy "sale_photos_delete_own" on public.sale_photos
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 3) sale_bids — 딜러 입찰 (Phase 1A: 운영자 수동, Phase 2: 딜러 셀프)
-- ============================================================
create table if not exists public.sale_bids (
  id uuid primary key default gen_random_uuid(),
  sale_request_id uuid not null references public.sale_requests(id) on delete cascade,
  dealer_id uuid references auth.users(id) on delete set null,
  dealer_name text not null,
  dealer_phone text,
  dealer_location text,
  bid_amount bigint not null check (bid_amount > 0),
  notes text,
  status text not null default 'offered' check (status in
    ('offered', 'selected', 'rejected', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists sale_bids_request_idx
  on public.sale_bids (sale_request_id, bid_amount desc);

alter table public.sale_bids enable row level security;
-- 본인 매각 신청에 들어온 입찰만 조회 가능 + 딜러는 자기 입찰 조회 가능
drop policy if exists "sale_bids_select_own_or_dealer" on public.sale_bids;
create policy "sale_bids_select_own_or_dealer" on public.sale_bids
  for select using (
    auth.uid() = dealer_id
    or exists (
      select 1 from public.sale_requests sr
      where sr.id = sale_request_id and sr.user_id = auth.uid()
    )
  );
-- 딜러는 본인 user_id 로 입찰 등록 (Phase 2)
drop policy if exists "sale_bids_insert_dealer" on public.sale_bids;
create policy "sale_bids_insert_dealer" on public.sale_bids
  for insert with check (auth.uid() = dealer_id);

-- ============================================================
-- 4) sale_transactions — 실거래 매각 데이터베이스 (시세 DB)
-- ============================================================
create table if not exists public.sale_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  source_sale_request_id uuid references public.sale_requests(id) on delete set null,
  channel text not null check (channel in ('cartiming', 'external')),
  sold_price bigint not null check (sold_price > 0),
  sold_at date not null,
  buyer_type text check (buyer_type is null or buyer_type in
    ('dealer', 'individual', 'unknown')),
  -- 차량 스냅샷 (매각 시점의 정보, vehicle 이 삭제되어도 보존)
  snapshot_manufacturer text not null,
  snapshot_model text not null,
  snapshot_trim text,
  snapshot_year smallint not null,
  snapshot_mileage integer not null,
  snapshot_fuel_type text,
  snapshot_transmission text,
  snapshot_body_type text,
  snapshot_damage_count smallint not null default 0,
  snapshot_plate_category text check (snapshot_plate_category is null or
    snapshot_plate_category in ('private', 'rental', 'commercial')),
  created_at timestamptz not null default now()
);

create index if not exists sale_transactions_vehicle_lookup_idx
  on public.sale_transactions (snapshot_manufacturer, snapshot_model, snapshot_year, sold_at desc);
create index if not exists sale_transactions_user_idx
  on public.sale_transactions (user_id, sold_at desc);

alter table public.sale_transactions enable row level security;
-- 본인 거래는 조회 가능
drop policy if exists "sale_transactions_select_own" on public.sale_transactions;
create policy "sale_transactions_select_own" on public.sale_transactions
  for select using (auth.uid() = user_id);
-- 본인이 직접 외부 매각 신고 가능
drop policy if exists "sale_transactions_insert_own" on public.sale_transactions;
create policy "sale_transactions_insert_own" on public.sale_transactions
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 5) dealers — 딜러 프로필 (Phase 2)
-- ============================================================
create table if not exists public.dealers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  business_reg_number text not null,
  contact_phone text not null,
  location text,
  verified boolean not null default false,
  verified_at timestamptz,
  rating_avg numeric(3,2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists dealers_verified_idx
  on public.dealers (verified, created_at desc);

alter table public.dealers enable row level security;
drop policy if exists "dealers_select_all" on public.dealers;
create policy "dealers_select_all" on public.dealers
  for select using (true);  -- 모든 사용자가 딜러 프로필 조회 가능 (입찰 검토용)
drop policy if exists "dealers_upsert_own" on public.dealers;
create policy "dealers_upsert_own" on public.dealers
  for insert with check (auth.uid() = user_id);
drop policy if exists "dealers_update_own" on public.dealers;
create policy "dealers_update_own" on public.dealers
  for update using (auth.uid() = user_id);

-- ============================================================
-- 6) 영구 무료 슬롯용 컬럼 추가 + 카타이밍 매각 완료시 자동 증가
-- ============================================================
alter table public.user_credits
  add column if not exists permanent_free_slots integer not null default 0
    check (permanent_free_slots >= 0);

-- ============================================================
-- 7) Storage bucket 안내 (코드로 못 만듦 — Supabase 대시보드에서 직접)
-- ============================================================
-- 별도로 'sale-photos' 버킷 만들기:
--   Supabase Dashboard → Storage → New bucket
--   Name: sale-photos
--   Public: false (서명된 URL 만 접근)
--   File size limit: 10 MB
--   Allowed mime types: image/jpeg, image/png, image/webp, image/heic
