-- 출시 전 정합성/보안 보강
--  1) sale_transactions: 카타이밍 매각 1건당 거래기록 1개 보장 (이중 수수료/슬롯 방지)
--  2) sale-photos 스토리지 버킷 + 본인 폴더 RLS (버전관리에 누락돼 있던 것 보강)

-- =========================
-- 1) 카타이밍 매각 중복 거래기록 방지
--    source_sale_request_id 가 있는 행(=카타이밍 매각)은 신청당 1건만.
--    외부매각(source_sale_request_id is null)은 제약 없음(부분 인덱스).
-- =========================
create unique index if not exists sale_transactions_unique_source_request
  on public.sale_transactions (source_sale_request_id)
  where source_sale_request_id is not null;

-- =========================
-- 2) sale-photos 버킷 (private) — 매각 차량/옵션표/감가 증빙 사진
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sale-photos',
  'sale-photos',
  false,
  26214400, -- 25 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects RLS — 본인 폴더(path 첫 segment = user_id)만.
-- (운영자/딜러 열람은 service-role 키로 우회 조회하므로 별도 정책 불필요)
drop policy if exists "sale_photos_storage_select_own" on storage.objects;
create policy "sale_photos_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'sale-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sale_photos_storage_insert_own" on storage.objects;
create policy "sale_photos_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sale-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sale_photos_storage_update_own" on storage.objects;
create policy "sale_photos_storage_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'sale-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sale_photos_storage_delete_own" on storage.objects;
create policy "sale_photos_storage_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'sale-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
