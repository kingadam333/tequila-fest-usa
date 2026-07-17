import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL, passwordResetHtml } from "@/lib/resend";
import { verifyTurnstile } from "@/lib/turnstile";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email, captchaToken } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) return NextResponse.json({ error: "CAPTCHA failed" }, { status: 400 });

  // Check if this email has a real, working login — NOT just a
  // customer_accounts row. /api/pre-checkout upserts a bare "lead" row (no
  // Auth user) the moment someone starts checkout, before they ever set a
  // password. Checking customer_accounts alone used to send these leads a
  // reset link that could never actually work (no Auth user to reset),
  // which is exactly what several customers hit — "it sent me the email but
  // then says no account exists." They need to go set an initial password
  // via signup (which now correctly claims the lead row) instead.
  const db = supabaseAdmin as any;
  const cleanEmail = email.toLowerCase();
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const hasRealLogin = !listErr && users.some(u => u.email?.toLowerCase() === cleanEmail);

  if (!hasRealLogin) {
    // Check if they have a ticket order — if so, direct them to sign up
    const { data: order } = await db
      .from("ticket_orders")
      .select("id")
      .ilike("customer_email", email)
      .limit(1)
      .single();

    if (order) {
      return NextResponse.json({ noAccount: true, hasTickets: true });
    }
    // No login and no tickets — still return generic success to avoid email enumeration
    return NextResponse.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Delete any existing tokens for this email, then insert new one
  await db.from("password_reset_tokens").delete().eq("email", email.toLowerCase());
  await db.from("password_reset_tokens").insert({ token, email: email.toLowerCase(), expires_at: expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your Tequila Fest USA password",
      html: passwordResetHtml({ resetUrl }),
    });
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const db = supabaseAdmin as any;
  const { data } = await db
    .from("password_reset_tokens")
    .select("email, expires_at")
    .eq("token", token)
    .single();

  if (!data || new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({ valid: true, email: data.email });
}
