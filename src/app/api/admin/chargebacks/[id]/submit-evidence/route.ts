import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { buildEvidenceText } from "@/lib/chargebacks";

// Saves the evidence bundle to Stripe as a DRAFT (submit: false) — it shows
// up in the Stripe Dashboard's dispute evidence form, pre-filled, but still
// requires a human to review and click Submit there. Deliberately not a
// one-click final submission: evidence can only be sent to the card network
// once, so the last review step stays manual in Stripe's own UI.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data: chargeback } = await db.from("chargebacks").select("*").eq("id", id).single();
  if (!chargeback) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: order } = chargeback.order_id
    ? await db.from("ticket_orders").select("*").eq("id", chargeback.order_id).maybeSingle()
    : { data: null };

  const evidenceText = buildEvidenceText(chargeback, order);

  try {
    await stripe.disputes.update(chargeback.stripe_dispute_id, {
      evidence: {
        uncategorized_text: evidenceText,
        product_description: order ? `${order.quantity}x ${order.ticket_type} ticket(s) to Tequila Fest ${order.event_city}` : undefined,
        billing_address: order?.billing_address
          ? [order.billing_address.line1, order.billing_address.line2, order.billing_address.city, order.billing_address.state, order.billing_address.postal_code, order.billing_address.country].filter(Boolean).join(", ")
          : undefined,
        customer_email_address: chargeback.customer_email || undefined,
        customer_name: chargeback.customer_name || undefined,
        refund_refusal_explanation: "Tequila Fest USA's Terms of Service, agreed to at checkout, state all ticket sales are final with no refunds or exchanges for any reason.",
      },
      submit: false,
    });
  } catch (err: any) {
    console.error("Submit evidence to Stripe error:", err);
    return NextResponse.json({ error: err?.message || "Failed to save evidence to Stripe" }, { status: 500 });
  }

  await db.from("chargebacks").update({ evidence_submitted_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
