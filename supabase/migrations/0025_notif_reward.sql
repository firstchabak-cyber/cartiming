-- 0025: 푸시 알림 첫 활성화 보상(500캐시) 1회 지급 추적 플래그.

alter table public.user_credits
  add column if not exists notif_reward_granted boolean not null default false;
