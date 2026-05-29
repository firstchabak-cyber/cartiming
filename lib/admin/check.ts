// 운영자 이메일 화이트리스트 (Phase 2: admin 역할 시스템으로 교체)
export const ADMIN_EMAILS = new Set<string>(["ms@cartiming.app"]);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
