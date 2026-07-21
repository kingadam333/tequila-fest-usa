import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_VENDORS } from "@/lib/resend";

export const config = { api: { bodyParser: false } };

// Sends an ad hoc email (event details, load-in info, a venue map, etc.) to
// every paid vendor registered for a given city. Always goes out from
// vendors@ so replies land in the admin Vendors inbox — see
// api/webhooks/email-inbound for the routing that depends on that.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const formData = await req.formData();
  const city = (formData.get("city") as string || "").trim();
  const subject = (formData.get("subject") as string || "").trim();
  const body = (formData.get("body") as string || "").trim();
  const attachment = formData.get("attachment") as File | null;

  if (!city || !subject || !body) {
    return NextResponse.json({ error: "city, subject, and body are required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data: apps, error } = await db
    .from("vendor_applications")
    .select("email, business_name, name, cities")
    .eq("paid", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recipients = (apps || []).filter((a: any) => (a.cities || []).includes(city) && a.email);
  if (recipients.length === 0) {
    return NextResponse.json({ error: `No paid vendors found for ${city}` }, { status: 400 });
  }

  let attachments: { filename: string; content: string }[] | undefined;
  if (attachment && attachment.size > 0) {
    const buffer = Buffer.from(await attachment.arrayBuffer());
    attachments = [{ filename: attachment.name, content: buffer.toString("base64") }];
  }

  const bodyHtml = body
    .split(/\n{2,}/)
    .map(para => `<p style="color:rgba(255,248,240,0.75);font-size:15px;line-height:1.7;margin:0 0 16px">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const buildHtml = (firstName: string) => `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA — ${city.toUpperCase()}</p>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
    <p style="color:rgba(255,248,240,0.9);font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    ${bodyHtml}
  </div>
  <p style="color:rgba(255,248,240,0.25);font-size:12px;text-align:center;margin-top:24px">
    Questions? Reply to this email or contact <a href="mailto:vendors@mail.tequilafestusa.com" style="color:#F5A623">vendors@mail.tequilafestusa.com</a>
  </p>
</div></body></html>`;

  const failed: { email: string; error: string }[] = [];
  let sent = 0;

  for (const r of recipients) {
    const firstName = (r.name || "").split(" ")[0] || "there";
    try {
      await resend.emails.send({
        from: FROM_VENDORS,
        replyTo: FROM_VENDORS,
        to: r.email,
        subject,
        html: buildHtml(firstName),
        ...(attachments ? { attachments } : {}),
      });
      sent++;
    } catch (err: any) {
      failed.push({ email: r.email, error: err?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
}
