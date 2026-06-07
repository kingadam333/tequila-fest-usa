import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

const OLD_SITE   = "https://tequila-fest--lifechanging.replit.app";
const ADMIN_USER = process.env.REPLIT_ADMIN_USERNAME!;
const ADMIN_PASS = process.env.REPLIT_ADMIN_PASSWORD!;

function normalizeTicketType(name: string): string {
  const n = (name || "").toLowerCase().trim();
  if (n.includes("early bird")) return "Early Bird";
  if (n.includes("regular"))    return "Regular Rate";
  if (n.includes("late"))       return "Late Registration";
  if (n.includes("vip"))        return "VIP Experience";
  if (n.includes("general") || n.includes("ga") || n === "ga entry") return "GA";
  return name;
}

function cityFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("cincinnati")) return "Cincinnati";
  if (t.includes("cleveland"))  return "Cleveland";
  if (t.includes("columbus"))   return "Columbus";
  if (t.includes("phoenix"))    return "Phoenix";
  return title;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const db = supabaseAdmin as any;

  // Stream progress via SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (msg: string) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ msg })}\n\n`));
  };

  (async () => {
    try {
      await send("🔐 Logging in to old site...");

      if (!ADMIN_USER || !ADMIN_PASS) {
        await send("❌ Missing REPLIT_ADMIN_USERNAME or REPLIT_ADMIN_PASSWORD env vars");
        await writer.close();
        return;
      }

      const loginRes = await fetch(`${OLD_SITE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
      });

      if (!loginRes.ok) {
        await send("❌ Login failed — check credentials");
        await writer.close();
        return;
      }

      const cookie = loginRes.headers.get("set-cookie") || "";
      await send("✅ Logged in");

      // Get last synced order date from our DB
      const { data: lastSync } = await db.from("sync_log").select("synced_at").order("synced_at", { ascending: false }).limit(1);
      const lastSyncedAt = lastSync?.[0]?.synced_at ? new Date(lastSync[0].synced_at) : new Date(0);
      await send(`📅 Last sync: ${lastSync?.[0]?.synced_at ? new Date(lastSync[0].synced_at).toLocaleString() : "Never (full sync)"}`);

      // Fetch all orders from old site
      await send("📦 Fetching orders from old site...");
      const listRes = await fetch(`${OLD_SITE}/api/admin/ticket-owners`, {
        headers: { Cookie: cookie },
      });
      const allOrders = await listRes.json();
      const paidOrders = allOrders.filter((o: any) => o.status === "paid");
      await send(`📋 ${paidOrders.length} total paid orders on old site`);

      // Get existing order numbers in our DB to detect new ones
      const { data: existing } = await db.from("ticket_orders").select("order_number");
      const existingNums = new Set((existing || []).map((o: any) => o.order_number));

      // Filter to new orders only (not in our DB)
      const newOrders = paidOrders.filter((o: any) => !existingNums.has(o.orderNumber));
      await send(`🆕 ${newOrders.length} new orders to import`);

      if (newOrders.length === 0) {
        await send("✅ Already up to date — nothing to import");
        await db.from("sync_log").insert({ new_orders: 0, new_tickets: 0, notes: "No new orders found" });
        await writer.close();
        return;
      }

      let inserted = 0;
      let totalTickets = 0;

      for (const order of newOrders) {
        // Fetch full order detail
        const detailRes = await fetch(`${OLD_SITE}/api/admin/orders/${order.id}`, {
          headers: { Cookie: cookie },
        });
        const detail = await detailRes.json();

        const city = order.eventCity || cityFromTitle(order.eventTitle);
        const eventSlug = city.toLowerCase();
        let items = detail.items || [];

        if (items.length === 0) {
          const perTicket = order.ticketCount > 0 ? Number(order.totalAmount) / order.ticketCount : Number(order.totalAmount);
          const fallbackType = perTicket >= 120 ? "VIP Experience" : perTicket <= 6 ? "GA" : perTicket <= 56 ? "Early Bird" : perTicket <= 61 ? "Regular Rate" : "Late Registration";
          items = [{ ticketTypeName: fallbackType, quantity: order.ticketCount || 1, unitPrice: String(perTicket), subtotal: order.totalAmount }];
        }

        for (const item of items) {
          const ticketType = normalizeTicketType(item.ticketTypeName);
          const qty = Number(item.quantity);

          const orderNum = items.length > 1
            ? `${order.orderNumber}-${ticketType.replace(/\s/g, "").toUpperCase().slice(0, 3)}`
            : order.orderNumber;

          if (existingNums.has(orderNum)) continue;

          const { data: newOrder, error: orderErr } = await db.from("ticket_orders").insert({
            order_number: orderNum,
            customer_email: order.email,
            customer_name: order.name || order.email,
            event_slug: eventSlug,
            event_city: city,
            ticket_type: ticketType,
            quantity: qty,
            unit_price: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
            discount_amount: 0,
            total: Number(item.subtotal),
            stripe_session_id: items.length === 1 ? (detail.stripeSessionId || null) : null,
            stripe_payment_intent_id: detail.stripePaymentIntentId || null,
            status: "paid",
            created_at: order.createdAt,
            updated_at: order.createdAt,
          }).select().single();

          if (orderErr?.code === "23505") continue;
          if (orderErr) { await send(`⚠️ Order ${orderNum}: ${orderErr.message}`); continue; }

          if (newOrder) {
            const tickets = Array.from({ length: qty }, (_, i) => ({
              order_id: (newOrder as any).id,
              ticket_number: i + 1,
              event_slug: eventSlug,
              event_city: city,
              ticket_type: ticketType,
              holder_name: i === 0 ? (order.name || order.email) : "Guest",
              qr_code: `TKT-${(newOrder as any).id.slice(-6).toUpperCase()}-${ticketType.replace(/\s/g, "").slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
              status: "valid",
              created_at: order.createdAt,
            }));
            await db.from("ticket_instances").insert(tickets);
            inserted++;
            totalTickets += qty;
          }
        }
      }

      await db.from("sync_log").insert({ new_orders: inserted, new_tickets: totalTickets, notes: `Imported ${inserted} orders, ${totalTickets} tickets` });
      await send(`✅ Done! Imported ${inserted} new orders, ${totalTickets} tickets`);
    } catch (err: any) {
      await send(`❌ Error: ${err.message}`);
    }
    await writer.close();
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
