-- 0012: 매각 신청에 판매 지역 컬럼 추가 + 승인 흐름

alter table public.sale_requests
  add column if not exists sale_location text,
  add column if not exists approved_at timestamptz;
