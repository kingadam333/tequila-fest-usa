import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";
import crypto from "crypto";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;
  const { error } = await db.from("staff_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin as any;

  // Resend invite
  if (body.action === "resend_invite") {
    const { data: staff } = await db.from("staff_members").select("*").eq("id", id).single();
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.from("staff_members").update({
      invite_token: inviteToken,
      invite_expires_at: inviteExpires.toISOString(),
      status: "invited",
      password_hash: null,
    }).eq("id", id);

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://tequila-fest-usa.vercel.app"}/staff/invite/${inviteToken}`;
    await resend.emails.send({
      from: FROM_SUPPORT,
      to: staff.email,
      subject: `Your Tequila Fest USA staff invite (resent)`,
      html: `<p>Hi ${staff.name},</p><p>Here is your updated invite link:</p><p><a href="${inviteUrl}">${inviteUrl}</a></p><p>Expires in 7 days.</p>`,
    });
    return NextResponse.json({ success: true });
  }

  // Update permissions
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.permissions) updates.permissions = body.permissions;
  if (body.name) updates.name = body.name;

  const { error } = await db.from("staff_members").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
