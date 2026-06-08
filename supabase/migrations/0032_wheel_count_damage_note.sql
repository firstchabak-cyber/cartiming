-- 0032: 휠 기스를 '있음(boolean)' → '갯수(0~4)' 로 변경 + 사고/수리 메모(일자·파손부위) 텍스트 칸 추가.

-- 휠 기스: boolean(wheel_scuff) 제거 후 갯수(wheel_scuff_count) 신설.
-- (도입 직후라 보존할 실데이터 없음)
alter table public.vehicles drop column if exists wheel_scuff;

alter table public.vehicles
  add column if not exists wheel_scuff_count smallint
    check (wheel_scuff_count is null or (wheel_scuff_count >= 0 and wheel_scuff_count <= 4));

-- 사고/수리 메모: 일자(모르면 비움)·파손 부위 등을 자유롭게 적는 텍스트.
alter table public.vehicles
  add column if not exists damage_note text;

comment on column public.vehicles.wheel_scuff_count is '휠 기스(스크래치) 있는 휠 갯수 0~4 — 감가 미반영, 참고용';
comment on column public.vehicles.damage_note is '사고/수리 자유 메모 (일자·파손 부위 등). 일자는 선택.';
