import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTurnstile } from "@/lib/turnstile";
import { resend, INBOX_ROUTING, FROM_SUPPORT } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const { name, email, phone, subject, message, captchaToken } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  // Determine inbox routing based on subject
  const routing = INBOX_ROUTING[subject] || { from: FROM_SUPPORT, to: "help@mail.tequilafestusa.com", label: "Support" };

  // Save to Supabase with inbox label
  const db = supabaseAdmin as any;
  await db.from("contact_submissions").insert({
    name, email, phone: phone || null, subject, message, status: "new",
    inbox: routing.label,
  });

  // Notify the correct inbox
  try {
    await resend.emails.send({
      from: routing.from,
      to: routing.to,
      replyTo: email,
      subject: `[${routing.label}] ${subject} — ${name}`,
      html: `
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
        <p><strong>Subject:</strong> ${subject}</p>
        <hr>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr>
        <p style="color:#888;font-size:12px">Reply directly to this email to respond to ${name}.</p>
      `,
    });
  } catch (err) {
    console.error("Failed to send contact notification:", err);
  }

  return NextResponse.json({ success: true });
}
