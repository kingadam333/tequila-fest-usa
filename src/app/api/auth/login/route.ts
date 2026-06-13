import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyTurnstile } from "@/lib/turnstile";
import { supabaseAdmin } from "@/lib/supabase";
import { signStaffToken } from "@/lib/staffAuth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password, captchaToken } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });

  // ── 1. Check staff_members first ──────────────────────────────────────────
  const db = supabaseAdmin as any;
  const { data: staffMember } = await db
    .from("staff_members")
    .select("id, name, email, permissions, status, password_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (staffMember?.password_hash) {
    const match = await bcrypt.compare(password, staffMember.password_hash);
    if (match) {
      // Update last_login_at
      await db.from("staff_members").update({
        last_login_at: new Date().toISOString(),
        status: "active",
      }).eq("id", staffMember.id);

      // Issue a staff JWT
      const token = await signStaffToken({
        staffId: staffMember.id,
        email: staffMember.email,
        name: staffMember.name,
        permissions: staffMember.permissions,
      });

      return NextResponse.json({
        success: true,
        isStaff: true,
        staffToken: token,
        staffName: staffMember.name,
        permissions: staffMember.permissions,
      });
    }
    // Wrong password for a known staff email — return error immediately
    return NextResponse.json({ error: "Invalid email or password. Please try again." }, { status: 401 });
  }

  // ── 2. Fall through to Supabase customer auth ─────────────────────────────
  const res = NextResponse.json({ success: true, isStaff: false });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: "Invalid email or password. Please try again." },
      { status: 401 }
    );
  }

  return res;
}
