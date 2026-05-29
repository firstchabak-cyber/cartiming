import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

/** env SMTP 설정으로 transport 1회 생성. 미설정이면 null. */
function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host, // 네이버웍스: smtp.worksmobile.com
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true", // 465면 true, 587이면 false(STARTTLS)
    auth: { user, pass },
  });
  return transporter;
}

/**
 * 이메일 발송. 미설정/실패해도 throw 하지 않음(알림 흐름을 막지 않기 위함).
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  const from = process.env.SMTP_FROM || "카타이밍 <help@cartiming.app>";
  try {
    await t.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
    return true;
  } catch (err) {
    console.error("sendEmail failed", err);
    return false;
  }
}

/** 알림용 기본 이메일 HTML 템플릿 */
export function notificationEmailHtml(args: {
  title: string;
  message: string;
  ctaUrl: string;
}): string {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f5f7;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#2563EB;padding:20px 24px;">
      <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">카타이밍</p>
    </div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#111;">${escapeHtml(args.title)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444;white-space:pre-line;">${escapeHtml(args.message)}</p>
      <a href="${args.ctaUrl}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;">자세히 보기</a>
    </div>
    <div style="padding:16px 24px;background:#fafafa;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#999;">카타이밍 · 내 차의 매각 적기를 알려드립니다<br/>이 메일은 알림 설정에 따라 발송되었습니다. 마이페이지에서 알림을 끌 수 있어요.</p>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
