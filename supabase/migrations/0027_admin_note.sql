-- 0027: 관리자 '추가 입력 요청' 코멘트 컬럼.
-- 반려(종료)와 달리, 상태는 유지하고 고객/딜러에게 보완을 요청할 때 사용.

alter table public.sale_requests
  add column if not exists admin_note text;

alter table public.dealer_wanted
  add column if not exists admin_note text;
