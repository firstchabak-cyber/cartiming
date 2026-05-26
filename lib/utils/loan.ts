export type LoanInfo = {
  principal: number;
  startedAt: string;
  months: number;
  apr: number;
};

export function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

export function monthlyPayment(loan: LoanInfo): number {
  const r = loan.apr / 100 / 12;
  const n = loan.months;
  if (r === 0) return loan.principal / n;
  const factor = Math.pow(1 + r, n);
  return (loan.principal * r * factor) / (factor - 1);
}

export function balanceAfterMonths(loan: LoanInfo, k: number): number {
  if (k <= 0) return loan.principal;
  if (k >= loan.months) return 0;
  const r = loan.apr / 100 / 12;
  const n = loan.months;
  if (r === 0) return loan.principal * (1 - k / n);
  const factor = Math.pow(1 + r, n);
  const passed = Math.pow(1 + r, k);
  return Math.max(0, (loan.principal * (factor - passed)) / (factor - 1));
}

export type LoanBalanceTimeline = {
  now: number;
  after_1m: number;
  after_3m: number;
  after_6m: number;
  after_1y: number;
  after_2y: number;
  after_3y: number;
};

export function loanBalanceTimeline(
  loan: LoanInfo,
  referenceDateIso: string,
): LoanBalanceTimeline {
  const elapsed = Math.max(0, monthsBetween(loan.startedAt, referenceDateIso));
  return {
    now: Math.round(balanceAfterMonths(loan, elapsed)),
    after_1m: Math.round(balanceAfterMonths(loan, elapsed + 1)),
    after_3m: Math.round(balanceAfterMonths(loan, elapsed + 3)),
    after_6m: Math.round(balanceAfterMonths(loan, elapsed + 6)),
    after_1y: Math.round(balanceAfterMonths(loan, elapsed + 12)),
    after_2y: Math.round(balanceAfterMonths(loan, elapsed + 24)),
    after_3y: Math.round(balanceAfterMonths(loan, elapsed + 36)),
  };
}
