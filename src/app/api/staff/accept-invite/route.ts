import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: staff } = await db
    .from("staff_members")
    .select("id, name, email, permissions, status, invite_expires_at")
    .eq("invite_token", token)
    .single();

  if (!staff) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (new Date(staff.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired. Ask your admin to resend it." }, { status: 410 });
  }

  return NextResponse.json({
    name: staff.name,
    email: staff.email,
    permissions: staff.permissions,
  });
}

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: staff } = await db
    .from("staff_members")
    .select("id, invite_expires_at, status")
    .eq("invite_token", token)
    .single();

  if (!staff) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (new Date(staff.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { error } = await db
    .from("staff_members")
    .update({
      password_hash,
      status: "active",
      invite_token: null,
      invite_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", staff.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
