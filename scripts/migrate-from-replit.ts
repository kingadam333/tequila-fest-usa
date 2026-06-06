/**
 * Migration script — pulls all orders from old Replit site → Supabase
 *
 * Usage:
 *   npx tsx scripts/migrate-from-replit.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REPLIT_ADMIN_USERNAME  (your old admin username)
 *   REPLIT_ADMIN_PASSWORD  (your old admin password)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const OLD_SITE = "https://tequila-fest--lifechanging.replit.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_USER = process.env.REPLIT_ADMIN_USERNAME!;
const ADMIN_PASS = process.env.REPLIT_ADMIN_PASSWORD!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!ADMIN_USER || !ADMIN_PASS) {
  console.error("❌ Missing REPLIT_ADMIN_USERNAME or REPLIT_ADMIN_PASSWORD in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Normalise city names from old event titles
function cityFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("cincinnati")) return "Cincinnati";
  if (t.includes("cleveland")) return "Cleveland";
  if (t.includes("columbus")) return "Columbus";
  if (t.includes("phoenix")) return "Phoenix";
  return title;
}

function slugFromCity(city: string): string {
  return city.toLowerCase();
}

// Determine ticket type label from old order data
function ticketTypeLabel(order: OldOrder): string {
  const amount = Number(order.totalAmount || 0);
  const qty = Number(order.ticketCount || 1);
  const perTicket = qty > 0 ? amount / qty : amount;
  if (perTicket >= 120) return "vip";
  if (perTicket <= 6) return "ga";
  if (perTicket <= 56) return "earlyBird";
  if (perTicket <= 61) return "regular";
  return "late";
}

interface OldOrder {
  id: string;
  orderNumber: string;
  email: string;
  name: string;
  phone?: string;
  eventId?: string;
  eventTitle: string;
  eventCity?: string;
  status: string;
  totalAmount: string | number;
  ticketCount: number;
  createdAt: string;
  customerId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}

async function main() {
  console.log("🚀 Starting migration from Replit → Supabase\n");

  // ── Step 1: Log in to old admin ──────────────────────────────
  console.log("🔐 Logging in to old admin...");
  const loginRes = await fetch(`${OLD_SITE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });

  if (!loginRes.ok) {
    console.error("❌ Admin login failed:", loginRes.status, await loginRes.text());
    process.exit(1);
  }

  // Grab session cookie
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log("✅ Logged in\n");

  // ── Step 2: Fetch all orders ─────────────────────────────────
  console.log("📦 Fetching all orders from old site...");
  const ordersRes = await fetch(`${OLD_SITE}/api/admin/ticket-owners`, {
    headers: { Cookie: cookie },
  });

  if (!ordersRes.ok) {
    console.error("❌ Failed to fetch orders:", ordersRes.status, await ordersRes.text());
    process.exit(1);
  }

  const allOrders: OldOrder[] = await ordersRes.json();
  const paidOrders = allOrders.filter(o => o.status === "paid");
  console.log(`✅ Found ${allOrders.length} total orders, ${paidOrders.length} paid\n`);

  // ── Step 3: Check existing Supabase orders (avoid duplicates) ──
  const { data: existingOrders } = await supabase
    .from("ticket_orders")
    .select("order_number");
  const existingNumbers = new Set((existingOrders || []).map((o: { order_number: string }) => o.order_number));
  console.log(`📋 ${existingNumbers.size} orders already in Supabase\n`);

  // ── Step 4: Insert orders + tickets ─────────────────────────
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const order of paidOrders) {
    // Skip if already migrated
    if (existingNumbers.has(order.orderNumber)) {
      skipped++;
      continue;
    }

    const city = order.eventCity || cityFromTitle(order.eventTitle);
    const eventSlug = slugFromCity(city);
    const ticketType = ticketTypeLabel(order);
    const qty = Number(order.ticketCount) || 1;
    const total = Number(order.totalAmount) || 0;

    try {
      // Insert order
      const { data: newOrder, error: orderErr } = await supabase
        .from("ticket_orders")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({
          order_number: order.orderNumber,
          customer_email: order.email,
          customer_name: order.name || order.email,
          event_slug: eventSlug,
          event_city: city,
          ticket_type: ticketType,
          quantity: qty,
          unit_price: qty > 0 ? total / qty : total,
          subtotal: total,
          discount_amount: 0,
          total: total,
          stripe_session_id: order.stripeSessionId || null,
          stripe_payment_intent_id: order.stripePaymentIntentId || null,
          status: "paid",
          created_at: order.createdAt,
          updated_at: order.createdAt,
        } as never)
        .select()
        .single();

      if (orderErr) {
        // Duplicate stripe_session_id is expected for some old orders
        if (orderErr.code === "23505") {
          skipped++;
          continue;
        }
        throw orderErr;
      }

      // Create ticket instances
      if (newOrder) {
        const tickets = Array.from({ length: qty }, (_, i) => ({
          order_id: (newOrder as { id: string }).id,
          ticket_number: i + 1,
          event_slug: eventSlug,
          event_city: city,
          ticket_type: ticketType,
          holder_name: i === 0 ? (order.name || order.email) : "Guest",
          qr_code: `TKT-MIGR-${(newOrder as { id: string }).id.slice(-6).toUpperCase()}-${String(i + 1).padStart(3, "0")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
          status: "valid",
          created_at: order.createdAt,
        }));

        await supabase.from("ticket_instances").insert(tickets as never);
      }

      inserted++;
      if (inserted % 10 === 0) {
        console.log(`  → Migrated ${inserted} orders so far...`);
      }
    } catch (err) {
      console.error(`  ❌ Error on order ${order.orderNumber}:`, err);
      errors++;
    }
  }

  // ── Step 5: Summary ──────────────────────────────────────────
  console.log("\n─────────────────────────────────────");
  console.log(`✅ Migration complete`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped (already existed): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log("─────────────────────────────────────\n");

  if (inserted > 0) {
    console.log("🎉 Check your Supabase Table Editor → ticket_orders to verify.");
  }
}

main().catch(console.error);
