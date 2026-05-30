import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin/check";

export const dynamic = "force-dynamic";

/**
 * 관리자 전용 SMTP 진단. ?to=받는주소 로 실제 발송 시도하고
 * 성공/실패 + 에러 메시지 + 현재 설정을 그대로 보여준다.
 * 587/465 둘 다 시도해서 어느 쪽이 되는지 알려준다.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "관리자 전용" }, { status: 403 });
  }

  const url = new URL(request.url);
  const to = url.searchParams.get("to") || user.email!;

  const host = process.env.SMTP_HOST;
  const userEnv = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "카타이밍 <help@cartiming.app>";

  const config = {
    host: host ?? "(없음)",
    user: userEnv ?? "(없음)",
    passSet: pass ? `설정됨(길이 ${pass.length})` : "(없음)",
    from,
    envPort: process.env.SMTP_PORT ?? "(미설정)",
    envSecure: process.env.SMTP_SECURE ?? "(미설정)",
  };

  if (!host || !userEnv || !pass) {
    return NextResponse.json({
      ok: false,
      reason: "환경변수 누락",
      config,
    });
  }

  // 587(STARTTLS)와 465(SSL) 둘 다 시도
  const attempts: Array<{ port: number; secure: boolean }> = [
    { port: 587, secure: false },
    { port: 465, secure: true },
  ];

  const results: Array<Record<string, unknown>> = [];
  for (const a of attempts) {
    try {
      const t = nodemailer.createTransport({
        host,
        port: a.port,
        secure: a.secure,
        auth: { user: userEnv, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });
      const info = await t.sendMail({
        from,
        to,
        subject: `[카타이밍] SMTP 테스트 (${a.port})`,
        text: `이 메일이 보이면 SMTP ${a.port} 포트로 발송 성공입니다.`,
        html: `<p>이 메일이 보이면 SMTP <b>${a.port}</b> 포트로 발송 성공입니다.</p>`,
      });
      results.push({
        port: a.port,
        secure: a.secure,
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
      });
    } catch (e) {
      results.push({
        port: a.port,
        secure: a.secure,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const anyOk = results.some((r) => r.success);
  return NextResponse.json({ ok: anyOk, to, config, results });
}
