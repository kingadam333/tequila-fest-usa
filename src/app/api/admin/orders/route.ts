import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  try {
    // Fetch last 100 completed checkout sessions from Stripe
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
          status: s.payment_status === "paid" ? "confirmed" : s.payment_status,
          date: new Date(s.created * 1000).toISOString().split("T")[0],
          paymentIntentId: typeof pi === "string" ? pi : pi?.id || null,
          receiptUrl: typeof pi !== "string" && pi?.latest_charge
            ? `https://dashboard.stripe.com/payments/${pi.id}`
            : null,
        };
      });

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("Admin orders error:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
