import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_EMAIL, passwordResetHtml } from "@/lib/resend";
import crypto from "crypto";

// In-memory token store — replace with DB when backend is live
const resetTokens = new Map<string, { email: string; expires: number }>();

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour

  resetTokens.set(token, { email: email.toLowerCase(), expires });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tequila-fest-usa.vercel.app";
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
    // Still return success to prevent email enumeration
  }

  // Always return success (don't reveal if email exists)
  return NextResponse.json({ success: true });
}

// Verify token endpoint
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false });

  const record = resetTokens.get(token);
  if (!record || record.expires < Date.now()) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({ valid: true, email: record.email });
}
