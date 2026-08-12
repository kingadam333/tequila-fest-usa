import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { buildEvidenceText } from "@/lib/chargebacks";

// Pushes the evidence bundle to Stripe. `finalize: false` (default) saves it
// as a DRAFT — visible in the Stripe Dashboard's dispute form, pre-filled,
// still requiring a human click to actually submit. `finalize: true` submits
// it to the card network for real, right from this admin page — evidence can
// only be sent once per dispute, so the frontend gates this behind its own
// explicit confirm() before calling here.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const finalize = body?.finalize === true;
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
      submit: finalize,
    });
  } catch (err: any) {
    console.error("Submit evidence to Stripe error:", err);
    return NextResponse.json({ error: err?.message || "Failed to save evidence to Stripe" }, { status: 500 });
  }

  await db.from("chargebacks").update({ evidence_submitted_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true, finalized: finalize });
}
