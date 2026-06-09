// 무통장 입금 계좌 정보 (카드 결제 준비 전까지 사용).
// 한 곳에서 관리해 충전 화면·관리자·안내 메일이 같은 값을 쓰도록 한다.

export const BANK_ACCOUNT = {
  bank: "농협",
  number: "312-0207-6452-11",
  holder: "모토베이션",
} as const;

/** "농협 312-0207-6452-11 (모토베이션)" 형태 한 줄 */
export function bankAccountLine(): string {
  return `${BANK_ACCOUNT.bank} ${BANK_ACCOUNT.number} (${BANK_ACCOUNT.holder})`;
}
