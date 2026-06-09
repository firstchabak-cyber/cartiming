-- 0038: 자동 매각 감시를 '차량별'로 전환.
-- 계정 단위(한 번 결제로 전 차량) → 차량 1대당 1,000캐시. 켠 차량만 매월 자동분석·알림.

alter table public.vehicles
  add column if not exists auto_watch boolean not null default false,
  add column if not exists auto_watch_paid boolean not null default false;

-- 자동분석 크론이 켠 차량만 빠르게 추리도록
create index if not exists vehicles_auto_watch_idx
  on public.vehicles (auto_watch)
  where auto_watch = true;

-- 기존에 계정 단위 알림을 켰던(이미 결제한) 사용자는 손해 안 보게:
-- 현재 보유한 활성 차량 전부에 자동 감시를 무료로 켜준다(추가 차감 없음).
update public.vehicles v
set auto_watch = true, auto_watch_paid = true
where v.status = 'active'
  and exists (
    select 1 from public.user_credits uc
    where uc.user_id = v.user_id and uc.email_notifications = true
  );
