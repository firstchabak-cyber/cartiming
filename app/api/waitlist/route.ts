import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { APP_URL } from "@/lib/constants/app";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일을 입력해주세요"),
  // 어느 랜딩/캠페인에서 왔는지 (기본 welcome)
  source: z.string().trim().max(50).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "올바른 이메일을 입력해주세요" },
      { status: 400 },
    );
  }

  const email = parsed.data.email;

  // 비로그인 방문자가 남기는 이메일이라 RLS를 우회하는 admin 클라이언트로 저장한다.
  const admin = createAdminClient();
  const { error } = await admin.from("waitlist").insert({
    email,
    source: parsed.data.source ?? "welcome",
    // 어디서 들어온 방문인지 흔적 (있으면)
    referrer: request.headers.get("referer") ?? null,
  });

  // 23505 = unique 위반 = 이미 신청한 이메일. 사용자에겐 성공으로 보여주되
  // 환영 메일은 중복 발송하지 않는다.
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요" },
      { status: 500 },
    );
  }

  // 신규 신청자에게만 환영 메일 발송 (실패해도 신청 자체는 성공 처리).
  await sendEmail({
    to: email,
    subject: "카타임 출시 알림 신청이 완료됐어요 🚗",
    html: waitlistWelcomeHtml(),
    text:
      "카타임 출시 알림 신청이 완료됐어요.\n" +
      "매각 적기가 오면 가장 먼저 알려드릴게요.\n" +
      `지금 바로 내 차를 무료로 분석해볼 수도 있어요: ${APP_URL}/signup`,
  });

  return NextResponse.json({ ok: true });
}

/** 웨이트리스트 신청 환영 메일 HTML */
function waitlistWelcomeHtml(): string {
  const cta = `${APP_URL}/signup`;
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f5f7;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#2563EB;padding:20px 24px;">
      <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">카타임</p>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#111;">신청이 완료됐어요 🚗</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#444;">
        카타임 출시 알림을 신청해 주셔서 감사합니다.<br/>
        내 차의 <b>매각 적기</b>가 오면 가장 먼저 알려드릴게요.
      </p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444;">
        기다릴 필요 없이, 지금 바로 내 차를 무료로 분석해볼 수도 있어요.
      </p>
      <a href="${cta}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">지금 내 차 무료로 분석해보기</a>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#999;">카타임 · 내 차의 매각 적기를 알려드립니다<br/>이 메일은 출시 알림을 신청하셔서 발송되었습니다.</p>
    </div>
  </div>
</body></html>`;
}
