import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { sessionUser } from "@/lib/sessionUser";
import { stripe } from "@/lib/stripe";

// Saves (POST) or removes (DELETE) a browser push subscription. Public by
// design — subscribing is anonymous — so the endpoint is restricted to the
// real browser push services: the server later POSTs to whatever endpoint is
// stored here, and an arbitrary URL would turn admin sends into requests to
// any host an attacker chose.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.apple\.com$/,
];

function validEndpoint(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 1000) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(u.hostname)) ? u.href : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sub = body?.subscription;
  const endpoint = validEndpoint(sub?.endpoint);
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh.slice(0, 200) : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth.slice(0, 100) : "";
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const db = supabaseAdmin as unknown as SupabaseClient;
  const user = await sessionUser(req).catch(() => null);
  const row: Record<string, unknown> = {
    endpoint, p256dh, auth,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    updated_at: new Date().toISOString(),
  };
  // Only attach an identity when there is one, so an anonymous re-subscribe
  // (e.g. after logging out) doesn't wipe the email used for event targeting.
  if (user) {
    row.user_id = user.id;
    row.email = user.email?.toLowerCase() || null;
  } else if (typeof body?.checkoutSessionId === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(body.checkoutSessionId)) {
    // Fresh buyer on the confirmation page, not logged in yet: take the email
    // from the paid Stripe session (never from the browser) so this device
    // gets that event's ticket-holder notifications.
    try {
      const cs = await stripe.checkout.sessions.retrieve(body.checkoutSessionId);
      const email = cs.payment_status === "paid" ? (cs.customer_details?.email || cs.customer_email) : null;
      if (email) row.email = email.toLowerCase();
    } catch (err) {
      console.error("[push/subscribe] checkout session lookup failed:", err instanceof Error ? err.message : err);
    }
  }

  const oldEndpoint = validEndpoint(body?.oldEndpoint);
  if (oldEndpoint && oldEndpoint !== endpoint) {
    const { data: old } = await db.from("push_subscriptions").select("user_id, email").eq("endpoint", oldEndpoint).maybeSingle();
    if (old && !user) { row.user_id = old.user_id; row.email = old.email; }
    await db.from("push_subscriptions").delete().eq("endpoint", oldEndpoint);
  }

  const { error } = await db.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) {
    console.error("[push/subscribe] upsert failed:", error.message);
    return NextResponse.json({ error: "Couldn't save subscription" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const endpoint = validEndpoint(body?.endpoint);
  if (!endpoint) return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  await (supabaseAdmin as unknown as SupabaseClient).from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
