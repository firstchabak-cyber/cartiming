-- 0014: 딜러 매각 수수료 정산 추적

alter table public.sale_transactions
  add column if not exists fee_amount integer check (fee_amount is null or fee_amount >= 0),
  add column if not exists fee_status text check (fee_status is null or fee_status in
    ('uncharged', 'charged', 'paid', 'waived')),
  add column if not exists fee_charged_at timestamptz,
  add column if not exists fee_paid_at timestamptz,
  add column if not exists fee_note text;

create index if not exists sale_transactions_fee_status_idx
  on public.sale_transactions (fee_status, channel)
  where channel = 'cartiming';
