import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL, ticketConfirmationHtml } from "@/lib/resend";
import { getEvent } from "@/lib/events";
import { TICKET_LABELS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { order_number } = await req.json();
  if (!order_number) return NextResponse.json({ error: "order_number required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: order, error } = await db
    .from("ticket_orders")
    .select("*")
    .eq("order_number", order_number)
    .single();

  if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const event = getEvent(order.event_slug);
  const firstName = (order.customer_name || "Guest").split(" ")[0];
  const ticketLabel = TICKET_LABELS[order.ticket_type as keyof typeof TICKET_LABELS] || order.ticket_type || "All Inclusive";

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customer_email,
    subject: `🥃 You're in! Tequila Fest ${order.event_city || ""} — Order Confirmed`,
    html: ticketConfirmationHtml({
      firstName,
      eventCity: order.event_city || "USA",
      eventDate: event?.date || "2026",
      eventVenue: event ? `${event.venue}, ${event.venueDetail}` : "",
      ticketType: ticketLabel,
      quantity: order.quantity,
      total: parseFloat(order.total),
      orderNumber: order.order_number,
    }),
  });

  return NextResponse.json({ success: true, email: order.customer_email, result });
}
