-- 0035: 출시 알림 이메일 수집(웨이트리스트) — 랜딩페이지에서 비로그인 방문자의 이메일을 받아
-- '상품성 검증(이 메시지에 사람들이 이메일을 남기는가)' 실험에 사용한다.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- 어느 캠페인/페이지에서 들어왔는지 (실험별 반응 비교용)
  source text not null default 'welcome',
  -- 방문자가 어디서 왔는지 흔적 (커뮤니티/스레드 등 유입 분석용, 선택)
  referrer text,
  created_at timestamptz not null default now(),
  -- 같은 이메일 중복 수집 방지
  constraint waitlist_email_unique unique (email)
);

create index if not exists waitlist_created_idx
  on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;
-- 쓰기·읽기 모두 서버(admin client)만 — 정책 없음 = 일반/익명 사용자 접근 불가.
-- 이메일은 개인정보이므로 절대 공개로 열지 않는다.
