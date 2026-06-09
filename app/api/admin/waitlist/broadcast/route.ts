import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";
import { sendEmail } from "@/lib/email/send";
import { APP_URL } from "@/lib/constants/app";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 다량 발송 대비 최대 실행시간 확보

const schema = z.object({
  subject: z.string().trim().min(1, "제목을 입력해주세요").max(150),
  body: z.string().trim().min(1, "내용을 입력해주세요").max(5000),
  // 값이 있으면 그 주소로 '테스트 1통'만 발송 (전체 발송 전 미리보기용)
  testEmail: z.string().trim().toLowerCase().email().optional(),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function broadcastHtml(subject: string, body: string): string {
  const safeBody = escapeHtml(body).replace(/\n/g, "<br/>");
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f5f7;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#2563EB;padding:20px 24px;">
      <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">카타임</p>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#111;">${escapeHtml(subject)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#444;">${safeBody}</p>
      <a href="${APP_URL}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">카타임 바로가기</a>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#999;">카타임 · 내 차의 매각 적기를 알려드립니다<br/>이 메일은 출시 알림을 신청하셔서 발송되었습니다.</p>
    </div>
  </div>
</body></html>`;
}

/** 배열을 size 크기 묶음으로 나눔 */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  if (!isAdmin(user.email))
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.flatten().fieldErrors.subject?.[0] ??
          parsed.error.flatten().fieldErrors.body?.[0] ??
          "입력값 오류",
      },
      { status: 400 },
    );
  }

  const html = broadcastHtml(parsed.data.subject, parsed.data.body);
  const text = `${parsed.data.subject}\n\n${parsed.data.body}\n\n${APP_URL}`;

  // 테스트 발송 — 입력한 주소로 1통만
  if (parsed.data.testEmail) {
    const ok = await sendEmail({
      to: parsed.data.testEmail,
      subject: parsed.data.subject,
      html,
      text,
    });
    return NextResponse.json({ ok, test: true, sent: ok ? 1 : 0 });
  }

  // 전체 발송 — waitlist 전체 이메일 수집
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("waitlist")
    .select("email")
    .order("created_at", { ascending: true });
  const emails = Array.from(
    new Set(((rows as Array<{ email: string }>) ?? []).map((r) => r.email)),
  );

  if (emails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0 });
  }

  // SMTP 부하를 줄이기 위해 10통씩 묶어 순차 발송 (묶음 내부는 병렬)
  let sent = 0;
  let failed = 0;
  for (const group of chunk(emails, 10)) {
    const results = await Promise.all(
      group.map((to) =>
        sendEmail({ to, subject: parsed.data.subject, html, text }).catch(
          () => false,
        ),
      ),
    );
    for (const r of results) r ? sent++ : failed++;
  }

  return NextResponse.json({ ok: true, sent, failed, total: emails.length });
}
