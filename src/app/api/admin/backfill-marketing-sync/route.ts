import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { syncTicketBuyerToMarketingLists } from "@/lib/marketingSync";

// Hundreds of buyers × two sequential external API calls each can run past
// the default serverless timeout — allow up to 5 minutes for this one-off job.
export const maxDuration = 300;

// One-off backfill: the Brevo/TextMagic sync code didn't exist until this
// was wired into the Stripe webhook, so every ticket buyer before that point
// (all of Cincinnati's June event, and whatever Cleveland/Columbus/Phoenix
// sales happened before this shipped) was never pushed to either platform.
// This pulls every paid order and runs it through the same sync path.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const db = supabaseAdmin as any;
  const { data: orders, error } = await db
    .from("ticket_orders")
    .select("customer_email, customer_name, event_city")
    .eq("status", "paid");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orders?.length) return NextResponse.json({ ok: true, synced: 0 });

  // Dedupe by email+city — no need to push the same buyer to the same list
  // multiple times if they bought more than one order for that city.
  const seen = new Set<string>();
  const uniqueBuyers: { email: string; name: string; city: string }[] = [];
  for (const o of orders) {
    if (!o.customer_email || !o.event_city) continue;
    const key = `${o.customer_email.toLowerCase()}|${o.event_city.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueBuyers.push({ email: o.customer_email, name: o.customer_name || "", city: o.event_city });
  }

  // Fetch phone numbers in bulk from customer_accounts by email
  const emails = Array.from(new Set(uniqueBuyers.map(b => b.email.toLowerCase())));
  const { data: accounts } = await db
    .from("customer_accounts")
    .select("email, phone")
    .in("email", emails);
  const phoneByEmail = new Map((accounts || []).map((a: any) => [a.email.toLowerCase(), a.phone]));

  let synced = 0;
  const failed: { email: string; city: string; error: string }[] = [];

  for (const buyer of uniqueBuyers) {
    const nameParts = buyer.name.split(" ");
    try {
      await syncTicketBuyerToMarketingLists({
        city: buyer.city,
        email: buyer.email,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || undefined,
        phone: (phoneByEmail.get(buyer.email.toLowerCase()) as string) || null,
      });
      synced++;
    } catch (err: any) {
      failed.push({ email: buyer.email, city: buyer.city, error: err?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, totalOrders: orders.length, uniqueBuyers: uniqueBuyers.length, synced, failed });
}
