import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, phone, password, captchaToken } = await req.json();

  if (!firstName || !email || !password) {
    return NextResponse.json({ error: "First name, email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Verify CAPTCHA
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
  const captchaOk = await verifyTurnstile(captchaToken || "", ip);
  if (!captchaOk) return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });

  const { createClient } = await import("@supabase/supabase-js");
  const adminAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Check if account already exists
  const { data: existing } = await adminAuth
    .from("customer_accounts")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  // Use admin API so email is confirmed immediately — no confirmation email loop
  const { data, error } = await adminAuth.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName || "", phone: phone || "" },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Also create a row in customer_accounts for our own data
  if (data.user) {
    const db = adminAuth as any;
    await db.from("customer_accounts").upsert({
      id: data.user.id,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName || null,
      phone: phone || null,
    }, { onConflict: "id" });
  }

  return NextResponse.json({ success: true });
}
