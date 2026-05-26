-- 차량등록증 항목 + 옵션 컬럼 추가

alter table public.vehicles
  add column if not exists vin text
    check (vin is null or char_length(vin) between 11 and 17),
  add column if not exists displacement_cc integer
    check (displacement_cc is null or displacement_cc > 0),
  add column if not exists body_type text
    check (
      body_type is null or
      body_type in (
        'sedan','suv','hatchback','coupe','wagon',
        'van','pickup','convertible','other'
      )
    ),
  add column if not exists vehicle_class text
    check (
      vehicle_class is null or
      vehicle_class in ('passenger','van','truck','special')
    ),
  add column if not exists engine_code text,
  add column if not exists inspection_valid_until date,
  add column if not exists seating_capacity smallint
    check (seating_capacity is null or seating_capacity between 1 and 60),
  add column if not exists options text[];
