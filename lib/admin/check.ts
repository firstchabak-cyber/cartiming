// 운영자 이메일 화이트리스트 (Phase 2: admin 역할 시스템으로 교체)
export const ADMIN_EMAILS = new Set<string>([
  "ms@cartiming.app",
  "firstchabak@naver.com", // 기존 관리자 — ms@ 로그인 확인 후 제거 예정
]);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
