import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { resend, FROM_BRANDS } from "@/lib/resend";

// Plain-text only — looks like a personal email, not a marketing blast.
// Minimal HTML mirrors the text so the message renders identically in clients
// that prefer HTML, with no logos, banners, or styled chrome.
function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function plainHtml(message: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#222;white-space:pre-wrap">${escape(message)}</div>`;
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

  const html = plainHtml(message);
  const results: { to: string; ok: boolean; error?: string }[] = [];

  // Send individually so each recipient gets a clean To: (no exposed BCC list,
  // no shared message-id thread). Resend free tier: 2 req/sec; throttle lightly.
  for (let i = 0; i < list.length; i++) {
    const to = list[i];
    try {
      const r = await resend.emails.send({ from: FROM_BRANDS, to, subject, text: message, html });
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
