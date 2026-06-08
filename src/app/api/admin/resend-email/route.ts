import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL, qrTicketHtml } from "@/lib/resend";
import { getEvent } from "@/lib/events";
import { TICKET_LABELS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { order_number } = await req.json();
  if (!order_number) return NextResponse.json({ error: "order_number required" }, { status: 400 });

  const db = supabaseAdmin as any;

  // Fetch order
  const { data: order, error } = await db
    .from("ticket_orders")
    .select("*")
    .eq("order_number", order_number)
    .single();

  if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Fetch ticket instances (QR codes)
  const { data: instances } = await db
    .from("ticket_instances")
    .select("*")
    .eq("order_id", order.id)
    .order("ticket_number", { ascending: true });

  const event = getEvent(order.event_slug);
  const firstName = (order.customer_name || "Guest").split(" ")[0];
  const ticketLabel = TICKET_LABELS[order.ticket_type as keyof typeof TICKET_LABELS] || order.ticket_type || "All Inclusive";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";

  const ticketInstances = (instances || []).map((t: any, i: number) => ({
    qrCode: t.qr_code,
    ticketNumber: t.ticket_number || i + 1,
    totalInOrder: order.quantity,
    holderName: t.holder_name || order.customer_name,
    ticketType: ticketLabel,
  }));

  // Fallback: if no ticket instances exist, create a placeholder
  if (ticketInstances.length === 0) {
    for (let i = 0; i < order.quantity; i++) {
      ticketInstances.push({
        qrCode: `TKT-${order.id.slice(-8).toUpperCase()}-${String(i + 1).padStart(3, "0")}-RESENT`,
        ticketNumber: i + 1,
        totalInOrder: order.quantity,
        holderName: order.customer_name,
        ticketType: ticketLabel,
      });
    }
  }

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customer_email,
    subject: `🎟️ Your Tequila Fest ${order.event_city || ""} Tickets — ${order.order_number}`,
    html: qrTicketHtml({
      firstName,
      eventCity: order.event_city || "USA",
      eventDate: event?.date || "2026",
      eventTime: event?.time || "3:00 PM – 9:00 PM",
      eventVenue: event ? `${event.venue}, ${event.venueDetail}` : "",
      orderNumber: order.order_number,
      tickets: ticketInstances,
      appUrl,
      total: parseFloat(order.total),
      ticketType: ticketLabel,
      quantity: order.quantity,
    }),
  });

  return NextResponse.json({ success: true, email: order.customer_email, result });
}
