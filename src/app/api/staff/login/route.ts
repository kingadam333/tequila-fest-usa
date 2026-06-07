import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { signStaffToken } from "@/lib/staffAuth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data: staff } = await db
    .from("staff_members")
    .select("id, name, email, password_hash, permissions, status")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!staff || !staff.password_hash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (staff.status !== "active") {
    return NextResponse.json({ error: "Account not yet activated. Check your invite email." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Update last login
  await db.from("staff_members").update({ last_login_at: new Date().toISOString() }).eq("id", staff.id);

  const token = await signStaffToken({
    staffId: staff.id,
    email: staff.email,
    name: staff.name,
    permissions: staff.permissions,
  });

  return NextResponse.json({
    token,
    staff: { name: staff.name, email: staff.email, permissions: staff.permissions },
  });
}
