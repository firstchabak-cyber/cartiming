-- price_analyses에 1년/2년/3년 장기 예측 컬럼 추가
-- 기존 행 호환을 위해 nullable로 둠

alter table public.price_analyses
  add column if not exists predicted_1y bigint
    check (predicted_1y is null or predicted_1y >= 0),
  add column if not exists predicted_2y bigint
    check (predicted_2y is null or predicted_2y >= 0),
  add column if not exists predicted_3y bigint
    check (predicted_3y is null or predicted_3y >= 0);
