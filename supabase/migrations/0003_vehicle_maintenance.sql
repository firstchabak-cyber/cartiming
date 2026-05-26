-- 차량 정비/사고 이력

create table if not exists public.vehicle_maintenance (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('교환','판금','수리','정비','사고')),
  part text not null,
  description text,
  performed_at date not null,
  cost integer check (cost is null or cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists vehicle_maintenance_vehicle_performed_idx
  on public.vehicle_maintenance (vehicle_id, performed_at desc);

create index if not exists vehicle_maintenance_user_id_idx
  on public.vehicle_maintenance (user_id);

alter table public.vehicle_maintenance enable row level security;

drop policy if exists "vehicle_maintenance_select_own" on public.vehicle_maintenance;
create policy "vehicle_maintenance_select_own"
  on public.vehicle_maintenance for select
  using (auth.uid() = user_id);

drop policy if exists "vehicle_maintenance_insert_own" on public.vehicle_maintenance;
create policy "vehicle_maintenance_insert_own"
  on public.vehicle_maintenance for insert
  with check (auth.uid() = user_id);

drop policy if exists "vehicle_maintenance_update_own" on public.vehicle_maintenance;
create policy "vehicle_maintenance_update_own"
  on public.vehicle_maintenance for update
  using (auth.uid() = user_id);

drop policy if exists "vehicle_maintenance_delete_own" on public.vehicle_maintenance;
create policy "vehicle_maintenance_delete_own"
  on public.vehicle_maintenance for delete
  using (auth.uid() = user_id);
