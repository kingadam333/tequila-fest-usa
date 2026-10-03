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

  // Also create/update the row in customer_accounts for our own data.
  //
  // customer_accounts.id MUST equal the Auth user's id — /api/auth/session,
  // /api/redeem and /api/media/upload all look the customer up with
  // .eq("id", user.id), so a row whose id drifts from Auth is invisible to the
  // logged-in customer even though it holds their orders and points. A batch
  // of 46 rows had drifted this way and had to be re-keyed by hand, which is
  // expensive: all nine foreign keys into this table are NO ACTION on update,
  // so the id cannot simply be rewritten in place.
  //
  // Two ways this path could produce that drift, both now closed:
  if (data.user) {
    if (existingLead && data.user.id !== existingLead.id) {
      // Auth didn't honor the id we asked for. Writing the row anyway would
      // either orphan the lead row or fail on UNIQUE(email), so undo the Auth
      // user instead of leaving a half-made account behind. Mirrors the same
      // guard in ensureCustomerLogin().
      console.error(
        `signup: id mismatch for ${cleanEmail} — Auth returned ${data.user.id}, expected lead ${existingLead.id}`,
      );
      await adminAuth.auth.admin.deleteUser(data.user.id).catch(() => {});
      return NextResponse.json(
        { error: "We couldn't finish creating your account. Please try again or contact support." },
        { status: 500 },
      );
    }

    const { error: rowErr } = await db.from("customer_accounts").upsert({
      id: data.user.id,
      email: cleanEmail,
      first_name: firstName,
      last_name: lastName || null,
      phone: phone || null,
    }, { onConflict: "id" });

    // This error was previously unchecked, so a row that collided on
    // UNIQUE(email) (a lead row the .eq("email") lookup above missed, or one
    // created in the gap between that lookup and this write) returned
    // success: true to a customer who had no usable account row.
    if (rowErr) {
      console.error(`signup: customer_accounts upsert failed for ${cleanEmail}:`, rowErr.message);
      await adminAuth.auth.admin.deleteUser(data.user.id).catch(() => {});
      return NextResponse.json(
        { error: "We couldn't finish creating your account. Please try again or contact support." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
