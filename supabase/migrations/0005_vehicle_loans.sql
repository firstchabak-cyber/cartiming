-- vehicles에 대출 정보 컬럼 추가 (모두 nullable, 대출 없는 차량 호환)

alter table public.vehicles
  add column if not exists loan_principal bigint
    check (loan_principal is null or loan_principal >= 0),
  add column if not exists loan_started_at date,
  add column if not exists loan_months smallint
    check (loan_months is null or loan_months between 1 and 240),
  add column if not exists loan_apr numeric(5,3)
    check (loan_apr is null or loan_apr between 0 and 30);
