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
  const cleanEmail = email.toLowerCase();

  // Check whether a real login already exists — NOT just a customer_accounts
  // row. /api/pre-checkout upserts a bare "lead" row (no Auth user) the
  // moment someone starts checkout, before they ever set a password. If we
  // only checked customer_accounts, anyone who'd started checkout would be
  // told "an account already exists" on signup, with no way to actually log
  // in (the exact bug several customers hit — "it says I have an account,
  // which I don't").
  const { data: { users }, error: listErr } = await adminAuth.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: "Failed to check existing accounts" }, { status: 500 });
  if (users.find(u => u.email?.toLowerCase() === cleanEmail)) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  // A lead row may already exist from pre-checkout — claim it (same id)
  // rather than leaving it orphaned from the new Auth user.
  const db = adminAuth as any;
  const { data: existingLead } = await db.from("customer_accounts").select("id").eq("email", cleanEmail).maybeSingle();

  // Use admin API so email is confirmed immediately — no confirmation email loop
  const { data, error } = await adminAuth.auth.admin.createUser({
    ...(existingLead ? { id: existingLead.id } : {}),
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName || "", phone: phone || "" },
  } as any);

  if (error) {
    if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been registered")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Also create/update the row in customer_accounts for our own data
  if (data.user) {
    await db.from("customer_accounts").upsert({
      id: data.user.id,
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName || null,
      phone: phone || null,
    }, { onConflict: "id" });
  }

  return NextResponse.json({ success: true });
}
