import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;

  // All customer accounts (keyed by email)
  const { data: accounts } = await db
    .from("customer_accounts")
    .select("id, email, first_name, last_name, phone, loyalty_points, created_at");

  const accountMap = new Map<string, any>();
  for (const a of (accounts || [])) accountMap.set(a.email.toLowerCase(), a);

  // All orders
  const { data: orders } = await db
    .from("ticket_orders")
    .select("customer_email, customer_name, order_number, ticket_type, quantity, total, event_city, created_at, status")
    .order("created_at", { ascending: false });

  // Build per-email order map
  const orderMap = new Map<string, any[]>();
  for (const o of (orders || [])) {
    const key = (o.customer_email || "").toLowerCase();
    if (!orderMap.has(key)) orderMap.set(key, []);
    orderMap.get(key)!.push(o);
  }

  // Union: start with all ticket buyers, merge account data if it exists
  const emailsSeen = new Set<string>();
  const users: any[] = [];

  // First: all ticket buyers
  for (const [email, userOrders] of orderMap.entries()) {
    emailsSeen.add(email);
    const acct = accountMap.get(email);
    const firstName = acct?.first_name || (userOrders[0]?.customer_name || "").split(" ")[0] || "";
    const lastName  = acct?.last_name  || (userOrders[0]?.customer_name || "").split(" ").slice(1).join(" ") || "";
    users.push({
      id:             acct?.id || null,
      email,
      first_name:     firstName,
      last_name:      lastName,
      phone:          acct?.phone || null,
      loyalty_points: acct?.loyalty_points || 0,
      created_at:     acct?.created_at || userOrders[0]?.created_at,
      hasAccount:     !!acct,
      name:           acct ? [acct.first_name, acct.last_name].filter(Boolean).join(" ") || email
                           : (userOrders[0]?.customer_name || email),
      orders:         userOrders,
      hasTickets:     true,
      totalSpent:     userOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0),
      ticketCount:    userOrders.reduce((s: number, o: any) => s + Number(o.quantity || 0), 0),
    });
  }

  // Second: account-only users (no orders)
  for (const acct of (accounts || [])) {
    const key = acct.email.toLowerCase();
    if (emailsSeen.has(key)) continue;
    users.push({
      id:             acct.id,
      email:          acct.email,
      first_name:     acct.first_name,
      last_name:      acct.last_name,
      phone:          acct.phone,
      loyalty_points: acct.loyalty_points,
      created_at:     acct.created_at,
      hasAccount:     true,
      name:           [acct.first_name, acct.last_name].filter(Boolean).join(" ") || acct.email,
      orders:         [],
      hasTickets:     false,
      totalSpent:     0,
      ticketCount:    0,
    });
  }

  // Sort: ticket buyers first by most recent order, then free by created_at
  users.sort((a, b) => {
    const aDate = a.orders[0]?.created_at || a.created_at || "";
    const bDate = b.orders[0]?.created_at || b.created_at || "";
    return bDate.localeCompare(aDate);
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { firstName, lastName, email, phone, sendWelcome } = await req.json();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const db = supabaseAdmin as any;

  // Check duplicate
  const { data: existing } = await db.from("customer_accounts").select("id").eq("email", email).single();
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  // Create customer_accounts row
  const { data: user, error } = await db.from("customer_accounts").insert({
    email: email.toLowerCase().trim(),
    first_name: firstName || "",
    last_name: lastName || "",
    phone: phone || null,
    loyalty_points: 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create Supabase Auth account
  const tempPassword = `Agave${Math.floor(1000 + Math.random() * 9000)}`;
  await (supabaseAdmin as any).auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  // Optionally send welcome email with login link
  if (sendWelcome) {
    const { data: resetLink } = await (supabaseAdmin as any).auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase().trim(),
    });
    try {
      await resend.emails.send({
        from: FROM_SUPPORT,
        to: email,
        subject: "Your Tequila Fest USA account",
        html: `<!DOCTYPE html><html><body style="background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0;padding:40px 20px">
<div style="max-width:560px;margin:0 auto">
  <p style="font-size:26px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0 0 24px">TEQUILA FEST USA</p>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
    <p style="font-size:17px;font-weight:700;margin:0 0 8px">Hi ${firstName || "there"}!</p>
    <p style="color:rgba(255,248,240,0.6);font-size:15px;line-height:1.6;margin:0 0 20px">
      Your Tequila Fest USA account has been created. Click below to set your password and access your tickets.
    </p>
    <div style="text-align:center">
      <a href="${resetLink?.properties?.action_link || "https://tequila-fest-usa.vercel.app/login"}"
        style="display:inline-block;background:#F5A623;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
        ACCESS MY ACCOUNT
      </a>
    </div>
  </div>
</div></body></html>`,
      });
    } catch (err) {
      console.error("Welcome email failed:", err);
    }
  }

  return NextResponse.json({ success: true, user });
}
