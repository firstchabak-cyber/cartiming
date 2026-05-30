-- 0028: 관리자 삭제 이력. 고객/딜러/차량을 영구 삭제할 때 사유와 함께 기록.
-- 대상이 삭제돼도 이 로그는 남아 "누가·무엇을·언제·왜" 삭제했는지 추적 가능.

create table if not exists public.admin_deletion_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text,
  target_type text not null,        -- 'user' | 'dealer' | 'vehicle'
  target_id text not null,          -- 삭제된 대상 id
  target_label text,                -- 사람이 알아볼 식별값 (예: "현대 그랜저", "홍길동 dealer")
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_deletion_log_created_idx
  on public.admin_deletion_log (created_at desc);

alter table public.admin_deletion_log enable row level security;
-- 읽기/쓰기는 서버(admin client)만. 일반 정책 없음 = 일반 사용자 접근 불가.
