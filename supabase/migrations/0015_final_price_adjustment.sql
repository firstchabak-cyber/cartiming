-- 0015: 실 매입가 조정 (입찰가 vs 실제 매입가 + 감가 사유/사진)

alter table public.sale_requests
  add column if not exists final_price bigint check (final_price is null or final_price > 0),
  add column if not exists adjustment_reason text check (adjustment_reason is null or char_length(adjustment_reason) <= 1000),
  add column if not exists adjusted_at timestamptz;

-- 감가 증빙 사진 (스크래치, 사고 흔적 등)
create table if not exists public.sale_adjustment_photos (
  id uuid primary key default gen_random_uuid(),
  sale_request_id uuid not null references public.sale_requests(id) on delete cascade,
  dealer_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  sort_order smallint not null default 0,
  caption text check (caption is null or char_length(caption) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists sale_adjustment_photos_request_idx
  on public.sale_adjustment_photos (sale_request_id, sort_order);

alter table public.sale_adjustment_photos enable row level security;

-- 차주, 선정된 딜러, 운영자(서비스 롤) 조회 가능
drop policy if exists "sale_adjustment_photos_select_related"
  on public.sale_adjustment_photos;
create policy "sale_adjustment_photos_select_related"
  on public.sale_adjustment_photos for select
  using (
    auth.uid() = dealer_id
    or exists (
      select 1 from public.sale_requests sr
      where sr.id = sale_request_id and sr.user_id = auth.uid()
    )
  );

-- 선정된 딜러만 본인 매물에 사진 추가 가능
drop policy if exists "sale_adjustment_photos_insert_selected_dealer"
  on public.sale_adjustment_photos;
create policy "sale_adjustment_photos_insert_selected_dealer"
  on public.sale_adjustment_photos for insert
  with check (
    auth.uid() = dealer_id
    and exists (
      select 1 from public.sale_requests sr
      join public.sale_bids sb on sb.id = sr.selected_bid_id
      where sr.id = sale_request_id
        and sb.dealer_id = auth.uid()
        and sr.status = 'matched'
    )
  );

drop policy if exists "sale_adjustment_photos_delete_own"
  on public.sale_adjustment_photos;
create policy "sale_adjustment_photos_delete_own"
  on public.sale_adjustment_photos for delete
  using (auth.uid() = dealer_id);
