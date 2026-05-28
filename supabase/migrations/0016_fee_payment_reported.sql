-- 0016: 딜러가 입금 완료를 셀프 신고할 수 있는 컬럼

alter table public.sale_transactions
  add column if not exists fee_payment_reported_at timestamptz,
  add column if not exists fee_payment_method text check (
    fee_payment_method is null or fee_payment_method in
    ('bank_transfer', 'cash', 'card', 'other')
  );
