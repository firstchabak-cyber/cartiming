-- 0022: 신규 가입 보너스 3,000 → 2,000 캐시로 변경.
-- 신규 가입 시 자동 지급하는 트리거 함수만 교체 (기존 가입자 잔액은 건드리지 않음).

create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_credits (user_id, balance)
  values (new.id, 2000)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (
    user_id, type, amount, balance_after, description
  )
  values (new.id, 'signup_bonus', 2000, 2000, '신규 가입 보너스 2,000 캐시');

  return new;
end;
$$;
