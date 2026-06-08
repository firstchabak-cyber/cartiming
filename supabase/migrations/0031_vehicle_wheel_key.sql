-- 0031: 차량 추가 상태 필드 — 휠 기스(스크래치) 여부 + 자동차키(스마트키) 갯수.
-- 외판 상태(damage_map)는 이미 0009 에 존재하므로 추가하지 않음.

alter table public.vehicles
  add column if not exists wheel_scuff boolean not null default false;

alter table public.vehicles
  add column if not exists key_count smallint
    check (key_count is null or (key_count >= 0 and key_count <= 10));

comment on column public.vehicles.wheel_scuff is '휠 기스(스크래치) 있음 여부 — 감가 미반영, 참고용';
comment on column public.vehicles.key_count is '자동차키(스마트키) 갯수 — 1개면 추가 제작비 감가 가능';
