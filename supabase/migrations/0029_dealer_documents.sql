-- 딜러 인증 서류 업로드 — 사업자등록증 + 매매사원증
-- dealers 테이블에 서류 경로 컬럼 추가 + 비공개 스토리지 버킷(dealer-docs) + RLS

-- =========================
-- 1) dealers 컬럼 추가
-- =========================
alter table public.dealers
  add column if not exists business_reg_doc_path text,
  add column if not exists dealer_card_doc_path text;

-- =========================
-- 2) Storage 버킷 (dealer-docs, private) — 이미지 + PDF 허용
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dealer-docs',
  'dealer-docs',
  false,
  10485760, -- 10 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =========================
-- 3) storage.objects RLS — 본인 폴더만 (path 첫 segment = user_id)
--    (운영자는 service-role 키로 우회 조회하므로 별도 정책 불필요)
-- =========================
drop policy if exists "dealer_docs_storage_select_own" on storage.objects;
create policy "dealer_docs_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dealer-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dealer_docs_storage_insert_own" on storage.objects;
create policy "dealer_docs_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dealer-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dealer_docs_storage_update_own" on storage.objects;
create policy "dealer_docs_storage_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'dealer-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dealer_docs_storage_delete_own" on storage.objects;
create policy "dealer_docs_storage_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dealer-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
