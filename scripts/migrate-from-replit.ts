/**
 * Migration script — pulls all orders from old Replit site → Supabase
 * Uses real ticket type names from /api/admin/orders/:id
 *
 * Usage:  npx tsx scripts/migrate-from-replit.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const OLD_SITE = "https://tequila-fest--lifechanging.replit.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_USER = process.env.REPLIT_ADMIN_USERNAME!;
const ADMIN_PASS = process.env.REPLIT_ADMIN_PASSWORD!;

if (!SUPABASE_URL || !SUPABASE_KEY || !ADMIN_USER || !ADMIN_PASS) {
  console.error("❌ Missing env vars — check .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Normalize ticket type names to our standard keys
function normalizeTicketType(name: string): string {
  const n = (name || "").toLowerCase().trim();
  if (n.includes("early bird") || n === "early bird") return "Early Bird";
  if (n.includes("regular")) return "Regular Rate";
  if (n.includes("late")) return "Late Registration";
  if (n.includes("vip")) return "VIP Experience";
  if (n.includes("general") || n.includes("ga") || n === "ga entry") return "GA";
  return name; // keep original if unknown
}

function cityFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("cincinnati")) return "Cincinnati";
  if (t.includes("cleveland")) return "Cleveland";
  if (t.includes("columbus")) return "Columbus";
  if (t.includes("phoenix")) return "Phoenix";
  return title;
}

interface OrderItem {
  ticketTypeName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
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
  totalAmount: string;
  ticketCount: number;
  createdAt: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}

interface OrderDetail extends OldOrder {
  items: OrderItem[];
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}

async function main() {
  console.log("🚀 Starting migration from Replit → Supabase\n");

  // ── Login ────────────────────────────────────────────────────
  console.log("🔐 Logging in to old admin...");
  const loginRes = await fetch(`${OLD_SITE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  if (!loginRes.ok) { console.error("❌ Login failed"); process.exit(1); }
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log("✅ Logged in\n");

  // ── Fetch all paid orders ────────────────────────────────────
  console.log("📦 Fetching all orders...");
  const listRes = await fetch(`${OLD_SITE}/api/admin/ticket-owners`, {
    headers: { Cookie: cookie },
  });
  const allOrders: OldOrder[] = await listRes.json();
  const paidOrders = allOrders.filter(o => o.status === "paid");
  console.log(`✅ ${paidOrders.length} paid orders to migrate\n`);

  // ── Clear existing Supabase data ─────────────────────────────
  console.log("🗑️  Clearing existing Supabase ticket data...");
  await supabase.from("ticket_instances").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("ticket_orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✅ Cleared\n");

  // ── Migrate each order ───────────────────────────────────────
  let inserted = 0;
  let errors = 0;
  let totalTickets = 0;

  // City + type counters for summary
  const summary: Record<string, Record<string, number>> = {};

  for (const order of paidOrders) {
    try {
      // Fetch full order detail to get real ticket type names
      const detailRes = await fetch(`${OLD_SITE}/api/admin/orders/${order.id}`, {
        headers: { Cookie: cookie },
      });
      const detail: OrderDetail = await detailRes.json();

      const city = order.eventCity || cityFromTitle(order.eventTitle);
      const eventSlug = city.toLowerCase();
      const items: OrderItem[] = detail.items || [];

      // If no items, fall back to price-based detection
      if (items.length === 0) {
        const perTicket = order.ticketCount > 0
          ? Number(order.totalAmount) / order.ticketCount
          : Number(order.totalAmount);
        const fallbackType = perTicket >= 120 ? "VIP Experience"
          : perTicket <= 6 ? "GA"
          : perTicket <= 56 ? "Early Bird"
          : perTicket <= 61 ? "Regular Rate"
          : "Late Registration";

        items.push({
          ticketTypeName: fallbackType,
          quantity: order.ticketCount || 1,
          unitPrice: String(perTicket),
          subtotal: order.totalAmount,
        });
      }

      // Create one order row per ticket type (handles mixed orders)
      for (const item of items) {
        const ticketType = normalizeTicketType(item.ticketTypeName);
        const qty = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const subtotal = Number(item.subtotal);

        // Track for summary
        if (!summary[city]) summary[city] = {};
        summary[city][ticketType] = (summary[city][ticketType] || 0) + qty;

        const { data: newOrder, error: orderErr } = await supabase
          .from("ticket_orders")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert({
            order_number: items.length > 1
              ? `${order.orderNumber}-${ticketType.replace(/\s/g, "").toUpperCase().slice(0, 3)}`
              : order.orderNumber,
            customer_email: order.email,
            customer_name: order.name || order.email,
            event_slug: eventSlug,
            event_city: city,
            ticket_type: ticketType,
            quantity: qty,
            unit_price: unitPrice,
            subtotal: subtotal,
            discount_amount: 0,
            total: subtotal,
            stripe_session_id: items.length === 1 ? (detail.stripeSessionId || null) : null,
            stripe_payment_intent_id: detail.stripePaymentIntentId || null,
            status: "paid",
            created_at: order.createdAt,
            updated_at: order.createdAt,
          } as never)
          .select()
          .single();

        if (orderErr) {
          if (orderErr.code === "23505") continue; // duplicate, skip
          throw orderErr;
        }

        // Create individual ticket instances
        if (newOrder) {
          const tickets = Array.from({ length: qty }, (_, i) => ({
            order_id: (newOrder as { id: string }).id,
            ticket_number: i + 1,
            event_slug: eventSlug,
            event_city: city,
            ticket_type: ticketType,
            holder_name: i === 0 ? (order.name || order.email) : "Guest",
            qr_code: `TKT-${(newOrder as { id: string }).id.slice(-6).toUpperCase()}-${ticketType.replace(/\s/g, "").slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
            status: "valid",
            created_at: order.createdAt,
          }));

          await supabase.from("ticket_instances").insert(tickets as never);
          totalTickets += qty;
        }
      }

      inserted++;
      if (inserted % 20 === 0) console.log(`  → ${inserted} orders migrated...`);

    } catch (err) {
      console.error(`  ❌ Error on ${order.orderNumber}:`, err);
      errors++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log("✅ MIGRATION COMPLETE");
  console.log(`   Orders migrated: ${inserted}`);
  console.log(`   Total tickets:   ${totalTickets}`);
  console.log(`   Errors:          ${errors}`);
  console.log("══════════════════════════════════════════\n");

  const typeOrder = ["Early Bird", "Regular Rate", "Late Registration", "VIP Experience", "GA"];
  for (const city of Object.keys(summary).sort()) {
    const cityData = summary[city];
    const cityTotal = Object.values(cityData).reduce((a, b) => a + b, 0);
    console.log(`📍 ${city} — ${cityTotal} tickets`);
    for (const type of typeOrder) {
      if (cityData[type]) console.log(`   ${type.padEnd(20)} ${cityData[type]}`);
    }
    const unknown = Object.keys(cityData).filter(k => !typeOrder.includes(k));
    for (const k of unknown) console.log(`   ${k.padEnd(20)} ${cityData[k]} ⚠️`);
  }
}

main().catch(console.error);
