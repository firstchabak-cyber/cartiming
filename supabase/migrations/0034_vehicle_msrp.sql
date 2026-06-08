-- 0034: 신차가격(출고가, msrp) 선택 입력. 시세 감가의 출발점(기준값)으로 사용.
-- 구입가(purchase_price, 차주가 산 값)와는 별개 — msrp 는 '새 차였을 때 출고가'.
-- 비어 있으면 시세분석 AI 가 해당 트림/연식의 신차가격을 추정해서 사용한다.

alter table public.vehicles
  add column if not exists msrp bigint
    check (msrp is null or msrp >= 0);

comment on column public.vehicles.msrp is '신차가격(출고가). 감가 기준점. 비어있으면 AI가 추정.';
