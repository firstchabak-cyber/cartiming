-- 0018: 시세분석 시도 로그 (운영자 모니터링용)

create table if not exists public.analysis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  -- 결과: success / cache_hit / overload / error / insufficient_credits / validation_error
  outcome text not null check (outcome in
    ('success', 'cache_hit', 'overload', 'error', 'insufficient_credits', 'validation_error')),
  -- 사용된 Gemini 모델 (성공 시)
  model_used text,
  -- 응답 시간 ms (호출이 일어난 경우)
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  -- 분석 결과 가격 (성공 시)
  current_price bigint,
  -- 신호 (성공 시)
  signal text,
  -- 에러 메시지 (실패 시)
  error_message text,
  -- 차량 스냅샷 (로그 시점, 차량이 삭제돼도 보존)
  snapshot_manufacturer text,
  snapshot_model text,
  snapshot_year integer,
  created_at timestamptz not null default now()
);

create index if not exists analysis_logs_created_idx
  on public.analysis_logs (created_at desc);
create index if not exists analysis_logs_outcome_idx
  on public.analysis_logs (outcome, created_at desc);
create index if not exists analysis_logs_user_idx
  on public.analysis_logs (user_id, created_at desc);

alter table public.analysis_logs enable row level security;

-- 운영자(서비스 롤)만 select — RLS 정책 추가 없음 = anon/auth 접근 불가
-- INSERT 는 서비스 롤이 server-side 에서만 수행
