-- 차량 외판 상태 맵 (부위별 판금/교환/사고 상태)
-- 형식 예시: { "본넷": "교환", "앞도어(좌)": "판금", "트렁크": "사고" }

alter table public.vehicles
  add column if not exists damage_map jsonb not null default '{}'::jsonb;
