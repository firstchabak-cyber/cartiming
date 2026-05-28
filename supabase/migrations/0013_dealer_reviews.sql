-- 0013: 매각 후기 + 딜러 평점 자동 갱신

create table if not exists public.dealer_reviews (
  id uuid primary key default gen_random_uuid(),
  sale_request_id uuid not null unique references public.sale_requests(id) on delete cascade,
  dealer_id uuid not null references auth.users(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dealer_reviews_dealer_idx
  on public.dealer_reviews (dealer_id, created_at desc);

alter table public.dealer_reviews enable row level security;

-- 본인이 차주인 거래의 후기 조회/작성
drop policy if exists "dealer_reviews_select_all" on public.dealer_reviews;
create policy "dealer_reviews_select_all" on public.dealer_reviews
  for select using (true);  -- 후기는 모든 사용자(차주·딜러·운영자) 가 조회 가능 (신뢰 시스템)

drop policy if exists "dealer_reviews_insert_own" on public.dealer_reviews;
create policy "dealer_reviews_insert_own" on public.dealer_reviews
  for insert with check (auth.uid() = customer_user_id);

-- 후기 작성/수정/삭제 시 딜러 평점 자동 갱신
create or replace function public.update_dealer_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dealer_id uuid;
  v_avg numeric;
  v_count integer;
begin
  v_dealer_id := coalesce(new.dealer_id, old.dealer_id);
  select round(avg(rating)::numeric, 2), count(*)
    into v_avg, v_count
    from public.dealer_reviews
    where dealer_id = v_dealer_id;
  update public.dealers
    set rating_avg = v_avg, rating_count = v_count
    where user_id = v_dealer_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_update_dealer_rating_ins on public.dealer_reviews;
create trigger trigger_update_dealer_rating_ins
  after insert on public.dealer_reviews
  for each row execute function public.update_dealer_rating();

drop trigger if exists trigger_update_dealer_rating_upd on public.dealer_reviews;
create trigger trigger_update_dealer_rating_upd
  after update on public.dealer_reviews
  for each row execute function public.update_dealer_rating();

drop trigger if exists trigger_update_dealer_rating_del on public.dealer_reviews;
create trigger trigger_update_dealer_rating_del
  after delete on public.dealer_reviews
  for each row execute function public.update_dealer_rating();
