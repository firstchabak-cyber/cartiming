-- 내장 색상 컬럼 추가 (외장 색상은 기존 color 컬럼 사용)

alter table public.vehicles
  add column if not exists interior_color text;
