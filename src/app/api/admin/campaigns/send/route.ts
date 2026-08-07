import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { resend, FROM_VENDORS, FROM_EMAIL } from "@/lib/resend";
import { resolveAudience } from "@/lib/campaignAudience";
import { wrapEmailHtml } from "@/lib/emailLayout";

// Bulk campaign send can involve hundreds of ticket holders — allow up to
// 5 minutes and send with limited concurrency instead of one-at-a-time.
export const maxDuration = 300;

async function sendWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { audience, cities, subject, body, testEmail } = await req.json();

  if (!["vendors", "tickets"].includes(audience) || !Array.isArray(cities) || !cities.length) {
    return NextResponse.json({ error: "audience (vendors|tickets) and at least one city are required" }, { status: 400 });
  }
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }

  // Test mode — send only to this one address (e.g. yourself, for review)
  // instead of the real resolved audience. Uses the same template/subject
  // so what you see is exactly what recipients would get.
  const recipients = testEmail?.trim()
    ? [{ email: testEmail.trim(), name: "there" }]
    : await resolveAudience(audience, cities);
  if (!recipients.length) {
    return NextResponse.json({ error: `No ${audience === "vendors" ? "vendors" : "ticket holders"} found for ${cities.join(", ")}` }, { status: 400 });
  }

  const from = audience === "vendors" ? FROM_VENDORS : FROM_EMAIL;
  const replyTo = audience === "vendors" ? "vendors@mail.tequilafestusa.com" : "help@mail.tequilafestusa.com";
  const cityLabel = cities.join(" / ");

  const bodyHtml = body
    .trim()
    .split(/\n{2,}/)
    .map((para: string) => `<p style="color:rgba(255,248,240,0.75);font-size:15px;line-height:1.7;margin:0 0 16px">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const buildHtml = (firstName: string) => wrapEmailHtml(`
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA — ${cityLabel.toUpperCase()}</p>
  <div style="background:#1a0f00;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
    <p style="color:rgba(255,248,240,0.9);font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    ${bodyHtml}
  </div>
  <p style="color:rgba(255,248,240,0.5);font-size:12px;text-align:center;margin-top:24px">
    Questions? Reply to this email or contact <a href="mailto:${replyTo}" style="color:#F5A623">${replyTo}</a>
  </p>`);

  const failed: { email: string; error: string }[] = [];
  let sent = 0;

  await sendWithConcurrency(recipients, 8, async (r) => {
    try {
      await resend.emails.send({
        from,
        replyTo: from,
        to: r.email,
        subject,
        html: buildHtml(r.name.split(" ")[0] || "there"),
      });
      sent++;
    } catch (err: any) {
      failed.push({ email: r.email, error: err?.message || "Unknown error" });
    }
  });

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}
