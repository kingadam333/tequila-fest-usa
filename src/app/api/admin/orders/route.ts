import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getSupabaseOrders();
  }
  return getStripeOrders();
}

async function getSupabaseOrders() {
  const { supabaseAdmin } = await import("@/lib/supabase");

  const { data, error } = await supabaseAdmin
    .from("ticket_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Supabase orders error:", error);
    return getStripeOrders();
  }

  const orders = (data || []).map((o: Record<string, unknown>) => ({
    id: o.id,
    orderNumber: o.order_number,
    customer: o.customer_name,
    email: o.customer_email,
    event: o.event_city,
    ticketType: o.ticket_type,
    quantity: o.quantity,
    total: Number(o.total as string),
    status: o.status,
    date: String(o.created_at).split("T")[0],
    paymentIntentId: o.stripe_payment_intent_id,
    receiptUrl: o.stripe_payment_intent_id
      ? `https://dashboard.stripe.com/payments/${o.stripe_payment_intent_id}`
      : null,
  }));

  return NextResponse.json({ source: "supabase", orders });
}

async function getStripeOrders() {
  const { stripe } = await import("@/lib/stripe");

  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ["data.payment_intent"],
    });

    const orders = sessions.data
      .filter(s => s.metadata?.type === "ticket_purchase")
      .map(s => {
        const pi = s.payment_intent as import("stripe").Stripe.PaymentIntent | null;
        return {
          id: s.id,
          orderNumber: s.metadata?.orderNumber || s.id.slice(-8).toUpperCase(),
          customer: s.customer_details?.name || "—",
          email: s.customer_details?.email || s.customer_email || "—",
          event: s.metadata?.eventCity || "—",
          ticketType: s.metadata?.ticketType || "—",
          quantity: parseInt(s.metadata?.quantity || "1"),
          total: s.amount_total ? s.amount_total / 100 : 0,
          status: s.payment_status === "paid" ? "paid" : s.payment_status,
          date: new Date(s.created * 1000).toISOString().split("T")[0],
          paymentIntentId: typeof pi === "string" ? pi : pi?.id || null,
          receiptUrl: pi ? `https://dashboard.stripe.com/payments/${typeof pi === "string" ? pi : pi.id}` : null,
        };
      });

    return NextResponse.json({ source: "stripe", orders });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
