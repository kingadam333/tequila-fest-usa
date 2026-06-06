import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTurnstile } from "@/lib/turnstile";
import { resend, FROM_EMAIL } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const { name, email, phone, subject, message, captchaToken } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify CAPTCHA
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  // Save to Supabase
  const db = supabaseAdmin as any;
  await db.from("contact_submissions").insert({
    name, email, phone: phone || null, subject, message, status: "new",
  });

  // Notify admin via email
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "info@tequilafestusa.com",
      subject: `New contact: ${subject} from ${name}`,
      html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p>${message.replace(/\n/g, "<br>")}</p>`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true });
}
