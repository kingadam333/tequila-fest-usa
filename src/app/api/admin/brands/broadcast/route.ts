import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { resend, FROM_BRANDS } from "@/lib/resend";

function htmlBody(message: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:28px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
          <div style="color:#fff8f0;font-size:15px;line-height:1.7;white-space:pre-wrap">${message.replace(/\n/g, "<br>")}</div>
        </td></tr>
        <tr><td style="height:24px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:0">Tequila Fest USA · brands@mail.tequilafestusa.com · tequilafestusa.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { recipients, subject, message } = await req.json();
  const list: string[] = Array.isArray(recipients)
    ? recipients.map((e) => String(e).trim()).filter(Boolean)
    : [];
  if (!list.length || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "recipients, subject, and message required" }, { status: 400 });
  }

  const html = htmlBody(message);
  const results: { to: string; ok: boolean; error?: string }[] = [];

  // Send individually so each recipient gets a clean To: (no exposed BCC list,
  // no shared message-id thread). Resend free tier: 2 req/sec; throttle lightly.
  for (let i = 0; i < list.length; i++) {
    const to = list[i];
    try {
      const r = await resend.emails.send({ from: FROM_BRANDS, to, subject, html });
      results.push({ to, ok: !r.error, error: r.error?.message });
    } catch (err: any) {
      results.push({ to, ok: false, error: err?.message || "send failed" });
    }
    if (i < list.length - 1) await new Promise((res) => setTimeout(res, 600));
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return NextResponse.json({ sent, failed, results });
}
