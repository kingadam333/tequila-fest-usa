import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = supabaseAdmin as any;

  // Look up token in DB
  const { data: record } = await db
    .from("password_reset_tokens")
    .select("email, expires_at")
    .eq("token", token)
    .single();

  if (!record || new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: "Reset link has expired or is invalid." }, { status: 400 });
  }

  // Find the Supabase Auth user by email
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: "Failed to look up account." }, { status: 500 });

  const user = users.find(u => u.email?.toLowerCase() === record.email.toLowerCase());
  if (!user) return NextResponse.json({ error: "No account found for this email." }, { status: 404 });

  // Update password in Supabase Auth
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (updateErr) return NextResponse.json({ error: "Failed to update password." }, { status: 500 });

  // Consume the token
  await db.from("password_reset_tokens").delete().eq("token", token);

  return NextResponse.json({ success: true });
}
