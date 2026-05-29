-- 0023: 차량 구입가(취득가) 선택 입력 — 시세 분석의 감가 출발점 참고용.

alter table public.vehicles
  add column if not exists purchase_price bigint
    check (purchase_price is null or purchase_price >= 0);
