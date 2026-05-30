-- 0026: 확장성(1000+ 사용자) 대비 핫패스 인덱스 추가.
-- 모두 IF NOT EXISTS — 여러 번 실행해도 안전.

-- 네이버 로그인 + 이메일 발송: profiles 를 email 로 조회
create index if not exists profiles_email_idx
  on public.profiles (email);

-- 시세분석 캐시/최신조회: vehicle_id + 최신순
create index if not exists price_analyses_vehicle_generated_idx
  on public.price_analyses (vehicle_id, generated_at desc);

-- 무료분석 횟수 카운트: user_id 기준
create index if not exists price_analyses_user_idx
  on public.price_analyses (user_id);

-- 딜러 구매요청 매칭: 제조사+모델로 차주 조회
create index if not exists vehicles_make_model_idx
  on public.vehicles (manufacturer, model);

-- 정비이력 조회: vehicle_id + 최신순
create index if not exists vehicle_maintenance_vehicle_idx
  on public.vehicle_maintenance (vehicle_id, performed_at desc);
