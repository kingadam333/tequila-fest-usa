import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  try {
    const { paymentIntentId, reason } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "paymentIntentId required" }, { status: 400 });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: reason || "requested_by_customer",
    });

    return NextResponse.json({ success: true, refundId: refund.id, status: refund.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
