-- 0017: sale_requests.selected_bid_id → sale_bids.id 외래키 추가
-- (0011 에서 누락되어 PostgREST embed 가 작동하지 않음)

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sale_requests_selected_bid_id_fkey'
      and conrelid = 'public.sale_requests'::regclass
  ) then
    alter table public.sale_requests
      add constraint sale_requests_selected_bid_id_fkey
      foreign key (selected_bid_id) references public.sale_bids(id) on delete set null;
  end if;
end $$;
