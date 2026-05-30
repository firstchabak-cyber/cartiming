import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 관리자 삭제 이력 기록. 실패해도 삭제 흐름을 막지 않음(로그는 부가 기능).
 */
export async function logDeletion(
  admin: SupabaseClient,
  args: {
    adminId: string;
    adminEmail: string | null;
    targetType: "user" | "dealer" | "vehicle";
    targetId: string;
    targetLabel?: string | null;
    reason: string;
  },
): Promise<void> {
  try {
    await admin.from("admin_deletion_log").insert({
      admin_id: args.adminId,
      admin_email: args.adminEmail,
      target_type: args.targetType,
      target_id: args.targetId,
      target_label: args.targetLabel ?? null,
      reason: args.reason,
    });
  } catch {
    // 무시
  }
}
