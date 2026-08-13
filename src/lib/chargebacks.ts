import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

// Upserts a Stripe dispute into `chargebacks` and blacklists the buyer.
// Shared by the webhook (charge.dispute.created/updated/closed) and the
// admin "Sync from Stripe" backfill button — same logic either way, keyed
// by stripe_dispute_id so re-syncing an already-known dispute just updates
// its status (e.g. needs_response → lost) rather than duplicating it.
export async function syncDisputeToDb(db: any, dispute: Stripe.Dispute) {
  const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id || null;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id || null;

  const { data: order } = paymentIntentId
    ? await db.from("ticket_orders").select("id, customer_email, customer_name").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle()
    : { data: null };

  // A disputed charge might be a vendor's $150 booth fee rather than a
  // ticket order — vendor_applications tracks its own stripe_payment_intent_id
  // separately, so check there too before giving up on finding a match.
  const { data: vendorApp } = !order && paymentIntentId
    ? await db.from("vendor_applications").select("id, email, name, business_name").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle()
    : { data: null };

  const payload = {
    stripe_dispute_id: dispute.id,
    stripe_charge_id: chargeId,
    stripe_payment_intent_id: paymentIntentId,
    order_id: order?.id || null,
    vendor_application_id: vendorApp?.id || null,
    customer_email: (order?.customer_email || vendorApp?.email || dispute.evidence?.customer_email_address || "").toLowerCase() || null,
    customer_name: order?.customer_name || vendorApp?.name || dispute.evidence?.customer_name || null,
    amount: dispute.amount / 100,
    currency: dispute.currency,
    reason: dispute.reason,
    status: dispute.status,
    evidence_due_by: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toISOString() : null,
    raw: dispute as any,
    updated_at: new Date().toISOString(),
  };

  const { data: chargeback, error } = await db
    .from("chargebacks")
    .upsert(payload, { onConflict: "stripe_dispute_id" })
    .select()
    .single();
  if (error) {
    console.error("Chargeback upsert error:", error);
    return null;
  }

  // Blacklist the buyer the moment a dispute exists — regardless of how it's
  // eventually resolved. `ignoreDuplicates` so re-syncing a known dispute
  // doesn't clobber a blacklist entry an admin may have edited (notes, etc).
  if (chargeback.customer_email) {
    await db.from("blacklisted_buyers").upsert(
      { email: chargeback.customer_email, name: chargeback.customer_name, reason: "chargeback", chargeback_id: chargeback.id },
      { onConflict: "email", ignoreDuplicates: true }
    );
  }

  return chargeback;
}

// Pulls every dispute from Stripe (not just ones we've already seen via
// webhook) and syncs each — the backfill path for disputes that happened
// before this feature existed, or if a webhook delivery was ever missed.
export async function syncAllDisputesFromStripe(db: any) {
  let synced = 0;
  for await (const dispute of stripe.disputes.list({ limit: 100 })) {
    const result = await syncDisputeToDb(db, dispute);
    if (result) synced++;
  }
  return synced;
}

const REASON_LABELS: Record<string, string> = {
  duplicate: "Duplicate charge",
  fraudulent: "Fraudulent (claims they didn't authorize the charge)",
  subscription_canceled: "Subscription canceled",
  product_unacceptable: "Product/service unacceptable",
  product_not_received: "Product not received",
  unrecognized: "Unrecognized charge",
  credit_not_processed: "Credit not processed",
  general: "General",
  incorrect_account_details: "Incorrect account details",
  insufficient_funds: "Insufficient funds",
  bank_cannot_process: "Bank cannot process",
  debit_not_authorized: "Debit not authorized",
  customer_initiated: "Customer initiated",
};

// Composes the plain-text evidence bundle an admin pastes into Stripe's
// dispute-evidence portal (Dashboard → Payments → Disputes → Submit
// evidence). Built from what we actually captured at checkout — never
// invented — so it only claims what's verifiably true for THIS order.
export function buildEvidenceText(chargeback: any, order: any): string {
  const lines: string[] = [];

  lines.push(`TEQUILA FEST USA — Dispute Evidence`);
  lines.push(`Dispute: ${chargeback.stripe_dispute_id} | Reason: ${REASON_LABELS[chargeback.reason] || chargeback.reason}`);
  lines.push(`Order: ${order?.order_number || "N/A"} | Amount: $${Number(chargeback.amount).toFixed(2)} ${(chargeback.currency || "usd").toUpperCase()}`);
  lines.push("");

  lines.push("── Purchase details ──");
  lines.push(`Customer: ${chargeback.customer_name || order?.customer_name || "N/A"}`);
  lines.push(`Email: ${chargeback.customer_email || order?.customer_email || "N/A"}`);
  if (order) {
    lines.push(`Purchased: ${order.quantity}x ${order.ticket_type} — Tequila Fest ${order.event_city}, ${new Date(order.created_at).toLocaleDateString()}`);
  }
  lines.push("");

  // Only claim what this specific order actually has on file — an order
  // placed before card-verification capture shipped has neither, and
  // asserting "the buyer's CVC was verified" right under "not on file" is a
  // self-contradicting statement that would undermine the whole submission.
  const cvcPass = order?.card_cvc_check === "pass";
  const avsPass = order?.card_avs_check === "pass";
  const hasAnyVerification = !!order?.card_cvc_check || !!order?.card_avs_check;

  lines.push("── Card verification at time of purchase ──");
  if (order?.card_cvc_check) {
    lines.push(`CVC check: ${order.card_cvc_check.toUpperCase()} — the card's security code entered at checkout was checked against the card network's records.`);
  } else {
    lines.push(`CVC check: not on file for this order (this purchase predates our card-verification logging).`);
  }
  if (order?.card_avs_check) {
    lines.push(`Address verification (AVS): ${order.card_avs_check.toUpperCase()} — the billing address entered was checked against the cardholder's bank records.`);
  } else {
    lines.push(`Address verification (AVS): not on file for this order (this purchase predates our card-verification logging).`);
  }
  if (order?.billing_address) {
    const a = order.billing_address;
    const addr = [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(", ");
    lines.push(`Billing address entered by cardholder: ${addr || "N/A"}`);
  }
  if (cvcPass || avsPass) {
    lines.push("This was not a card-present or manually-keyed transaction — the buyer entered their own card number, CVC, and billing address directly into Stripe's secure checkout form, and the results above confirm those details matched the card issuer's records. A stranger could not have known the correct CVC and/or billing address for this card.");
  } else if (!hasAnyVerification) {
    lines.push("Note: this order was placed before our system began logging CVC/AVS check results, so we cannot cite a specific pass/fail result for this transaction. All purchases go through Stripe's standard checkout, which requires the card number, expiration, and CVC to be entered correctly before Stripe will authorize the charge at all — an incorrect CVC is rejected by the card network before the order is ever created.");
  } else {
    lines.push("Note: the verification checks on file for this order did not return a clear pass — this is included for completeness rather than as evidence of a verified match.");
  }
  lines.push("");

  lines.push("── Terms agreed to at purchase ──");
  lines.push(`Tequila Fest USA's Terms of Service (tequilafestusa.com/terms), which every ticket buyer must accept to complete checkout, state under "Tickets — All Sales Final":`);
  lines.push(`"All ticket sales are final. There are no refunds or exchanges, for any reason, including but not limited to: change of mind, inability to attend, illness, travel issues, weather, or dissatisfaction with the event."`);
  lines.push("The product (a valid event ticket, delivered by email with a scannable QR code immediately upon payment) was delivered as described and was usable for its intended purpose.");
  lines.push("");

  lines.push("── Requested outcome ──");
  lines.push(`We respectfully request this dispute be decided in the merchant's favor. ${cvcPass || avsPass ? "The cardholder's own payment details (CVC and/or billing address) were verified at the time of purchase, " : ""}The ticket was delivered, and the buyer agreed to a clear no-refund policy before completing checkout.`);

  return lines.join("\n");
}
