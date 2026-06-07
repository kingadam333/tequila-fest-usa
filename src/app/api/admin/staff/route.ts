import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("staff_members")
    .select("id, name, email, permissions, status, last_login_at, created_at, invite_expires_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { name, email, permissions } = await req.json();
  if (!name || !email || !permissions?.length) {
    return NextResponse.json({ error: "Name, email, and permissions required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;

  // Check if already exists
  const { data: existing } = await db.from("staff_members").select("id, status").eq("email", email).single();
  if (existing) {
    return NextResponse.json({ error: "A staff member with this email already exists" }, { status: 409 });
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data: staff, error } = await db
    .from("staff_members")
    .insert({
      name,
      email,
      permissions,
      status: "invited",
      invite_token: inviteToken,
      invite_expires_at: inviteExpires.toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send invite email
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://tequila-fest-usa.vercel.app"}/staff/invite/${inviteToken}`;
  const permLabels: Record<string, string> = {
    checkin: "Event Check-In",
    orders: "View Orders",
    inbox: "Contact Inbox",
    events: "View Events",
  };
  const permList = permissions.map((p: string) => permLabels[p] || p).join(", ");

  try {
    await resend.emails.send({
      from: FROM_SUPPORT,
      to: email,
      subject: `You're invited to the Tequila Fest USA staff portal`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:26px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
          <p style="color:rgba(255,248,240,0.3);font-size:13px;margin:6px 0 0">Staff Portal Invitation</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
          <p style="color:#fff8f0;font-size:18px;font-weight:700;margin:0 0 8px">Hi ${name}! 👋</p>
          <p style="color:rgba(255,248,240,0.6);font-size:15px;line-height:1.6;margin:0 0 20px">
            You've been invited to join the Tequila Fest USA staff portal. Click the button below to set up your password and access your staff account.
          </p>
          <div style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:10px;padding:14px 18px;margin-bottom:24px">
            <p style="color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Your Access</p>
            <p style="color:#F5A623;font-size:14px;font-weight:600;margin:0">${permList}</p>
          </div>
          <div style="text-align:center">
            <a href="${inviteUrl}" style="display:inline-block;background:#F5A623;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.5px">
              SET UP MY ACCOUNT
            </a>
          </div>
          <p style="color:rgba(255,248,240,0.25);font-size:12px;text-align:center;margin:20px 0 0">
            This link expires in 7 days. If you didn't expect this email, ignore it.
          </p>
        </td></tr>
        <tr><td style="height:24px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:0">Tequila Fest USA · help@tequilafestusa.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Don't fail — staff record created, email just didn't send
  }

  return NextResponse.json({ success: true, staff });
}
