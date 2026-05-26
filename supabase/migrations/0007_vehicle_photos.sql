-- 차량 사진 — Storage 버킷 + 메타데이터 테이블

-- =========================
-- vehicle_photos 테이블
-- =========================
create table if not exists public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_photos_vehicle_sort_idx
  on public.vehicle_photos (vehicle_id, sort_order);

alter table public.vehicle_photos enable row level security;

drop policy if exists "vehicle_photos_select_own" on public.vehicle_photos;
create policy "vehicle_photos_select_own"
  on public.vehicle_photos for select
  using (auth.uid() = user_id);

drop policy if exists "vehicle_photos_insert_own" on public.vehicle_photos;
create policy "vehicle_photos_insert_own"
  on public.vehicle_photos for insert
  with check (auth.uid() = user_id);

drop policy if exists "vehicle_photos_update_own" on public.vehicle_photos;
create policy "vehicle_photos_update_own"
  on public.vehicle_photos for update
  using (auth.uid() = user_id);

drop policy if exists "vehicle_photos_delete_own" on public.vehicle_photos;
create policy "vehicle_photos_delete_own"
  on public.vehicle_photos for delete
  using (auth.uid() = user_id);

-- =========================
-- Storage 버킷 (vehicle-photos, private)
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-photos',
  'vehicle-photos',
  false,
  26214400, -- 25 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =========================
-- storage.objects RLS — 본인 폴더만 (path 첫 segment = user_id)
-- =========================
drop policy if exists "vehicle_photos_storage_select_own" on storage.objects;
create policy "vehicle_photos_storage_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vehicle_photos_storage_insert_own" on storage.objects;
create policy "vehicle_photos_storage_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vehicle_photos_storage_update_own" on storage.objects;
create policy "vehicle_photos_storage_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vehicle_photos_storage_delete_own" on storage.objects;
create policy "vehicle_photos_storage_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vehicle-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
