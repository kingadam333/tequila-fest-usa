// Server-only helpers for sponsorship reservations ("Reserve This" on /sponsors).
// Lifecycle and columns are documented in the create_sponsor_reservations migration.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SPONSORS } from "@/lib/resend";
import { wrapEmailHtml } from "@/lib/emailLayout";
import { toE164 } from "@/lib/marketingSync";
import { sponsorEventLabel } from "@/lib/sponsorPackages";

export const sponsorDb = () => supabaseAdmin as unknown as SupabaseClient;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";

export type ReservationStatus = "pending" | "approved" | "declined" | "deposit_paid" | "paid" | "cancelled";

export type SponsorReservation = {
  id: string;
  package_id: string | null;
  package_name: string;
  events: string[];
  price_per_event: number;
  total: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  sms_consent: boolean;
  status: ReservationStatus;
  payment_method: "card" | "zelle" | "check" | "invoice" | null;
  pay_token: string;
  amount_paid: number;
  deposit_amount: number | null;
  invoice_number: string | null;
  invoice_due_date: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  declined_at: string | null;
  deposit_paid_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type PaymentSettings = {
  check_payable_to: string | null;
  mailing_address: string | null;
  zelle_handle: string | null;
  zelle_qr_url: string | null;
};

/** The deposit that reserves a spot on invoice terms: 10% of the total, whole dollars, at least $1. */
export const depositFor = (total: number) => Math.max(1, Math.round(total * 0.1));

/** Days between the deposit and the balance due date on the invoice. */
export const INVOICE_TERMS_DAYS = 30;

export const payUrl = (r: Pick<SponsorReservation, "pay_token">) => `${APP_URL}/sponsors/pay/${r.pay_token}`;

export const eventsLabel = (events: string[]) => events.map(sponsorEventLabel).join(" + ");

export const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const ym = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `TFS-${ym}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function loadPaymentSettings(): Promise<PaymentSettings | null> {
  const { data } = await sponsorDb().from("invoice_payment_settings").select("check_payable_to, mailing_address, zelle_handle, zelle_qr_url").limit(1).maybeSingle();
  return (data as PaymentSettings | null) ?? null;
}

/**
 * Whether every event on the reservation is still unsold for its package.
 * Only meaningful before the first payment: once a reservation has paid, the
 * package is sold *to it*, so later checks would wrongly block its own balance.
 */
export async function eventsStillAvailable(r: Pick<SponsorReservation, "package_id" | "events">): Promise<boolean> {
  if (!r.package_id) return false;
  const { data } = await sponsorDb().from("sponsor_packages").select("sold_events, is_active").eq("id", r.package_id).maybeSingle();
  if (!data || !data.is_active) return false;
  const sold: string[] = data.sold_events || [];
  return r.events.every((e) => !sold.includes(e));
}

/**
 * Marks the reservation's events sold on its package (the site then shows SOLD)
 * once each event has used up the package's slots_per_event. Call it after the
 * reservation itself is paid / deposit_paid, so it counts toward the total.
 * Without the slot count, the first of five Corporate Partners to pay for a
 * city would mark it sold and lock out the other four.
 */
export async function markPackageSold(r: Pick<SponsorReservation, "package_id" | "events">): Promise<void> {
  if (!r.package_id) return;
  const db = sponsorDb();
  const { data } = await db.from("sponsor_packages").select("sold_events, slots_per_event").eq("id", r.package_id).maybeSingle();
  if (!data) return;
  const slots: number = data.slots_per_event || 1;
  let full = r.events;
  if (slots > 1) {
    const { data: taken, error: countError } = await db
      .from("sponsor_reservations")
      .select("events")
      .eq("package_id", r.package_id)
      .in("status", ["paid", "deposit_paid"]);
    if (countError) {
      console.error("[sponsor] couldn't count paid reservations; leaving availability unchanged:", countError.message);
      return;
    }
    const rows = (taken || []) as { events: string[] }[];
    full = r.events.filter((e) => rows.filter((row) => (row.events || []).includes(e)).length >= slots);
  }
  if (!full.length) return;
  const sold = [...new Set([...(data.sold_events || []), ...full])];
  const { error } = await db.from("sponsor_packages").update({ sold_events: sold, updated_at: new Date().toISOString() }).eq("id", r.package_id);
  if (error) console.error("[sponsor] failed to mark package sold:", error.message);
}

/** Best-effort transactional text via TextMagic. Only sent with the applicant's consent; never throws. */
export async function sendSponsorSms(r: Pick<SponsorReservation, "contact_phone" | "sms_consent">, text: string): Promise<void> {
  const username = process.env.TEXTMAGIC_USERNAME;
  const apiKey = process.env.TEXTMAGIC_API_KEY;
  const phone = r.contact_phone ? toE164(r.contact_phone) : null;
  if (!r.sms_consent || !phone || !username || !apiKey) return;
  try {
    const res = await fetch("https://rest.textmagic.com/api/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${username}:${apiKey}`).toString("base64")}`,
      },
      body: JSON.stringify({ text, phones: phone }),
    });
    if (!res.ok) console.error("[sponsor] TextMagic send failed:", res.status, (await res.text()).slice(0, 300));
  } catch (err) {
    console.error("[sponsor] TextMagic send error:", err);
  }
}

/** Best-effort email from sponsors@ (replies land in the Sponsors inbox tab); never throws. */
export async function sendSponsorEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const { error } = await resend.emails.send({ from: FROM_SPONSORS, to, subject, html });
    if (error) console.error("[sponsor] email send failed:", error);
  } catch (err) {
    console.error("[sponsor] email send error:", err);
  }
}

// ─── Email bodies ────────────────────────────────────────────────────────────

const button = (href: string, label: string) =>
  `<div style="text-align:center;margin:32px 0"><a href="${href}" style="background:#f5a623;color:#0d0500;font-weight:bold;font-size:16px;padding:16px 36px;border-radius:8px;text-decoration:none;display:inline-block">${label}</a></div>`;

const summaryTable = (r: SponsorReservation) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #2a1a00">
    <tr><td style="padding:8px 0;opacity:.7">Package</td><td style="padding:8px 0;text-align:right;font-weight:bold">${escapeHtml(r.package_name)}</td></tr>
    <tr><td style="padding:8px 0;opacity:.7">Events</td><td style="padding:8px 0;text-align:right">${escapeHtml(eventsLabel(r.events))}</td></tr>
    <tr><td style="padding:8px 0;opacity:.7">Total</td><td style="padding:8px 0;text-align:right;color:#f5a623;font-weight:bold">${money(r.total)}</td></tr>
  </table>`;

const shell = (heading: string, body: string) => wrapEmailHtml(`
  <h1 style="color:#f5a623;font-size:26px;margin:0 0 4px">TEQUILA FEST USA</h1>
  <p style="opacity:.5;margin:0 0 28px">Sponsorships</p>
  <h2 style="color:#fff;margin:0 0 16px">${heading}</h2>
  ${body}
  <p style="opacity:.5;font-size:12px;text-align:center;margin-top:32px">Questions? Reply to this email or write to sponsors@mail.tequilafestusa.com</p>`, { maxWidth: 600 });

export function receivedEmail(r: SponsorReservation) {
  return shell("We received your sponsorship request", `
    <p>Hi ${escapeHtml(r.contact_name)},</p>
    <p>Thanks for your interest in sponsoring Tequila Fest USA. Here's what you requested for <strong>${escapeHtml(r.company_name)}</strong>:</p>
    ${summaryTable(r)}
    <p>Our team will review it and get back to you shortly. Once approved, you'll get a link to complete payment and lock in your spot.</p>`);
}

export function approvedEmail(r: SponsorReservation) {
  return shell("Your sponsorship is approved!", `
    <p>Hi ${escapeHtml(r.contact_name)},</p>
    <p>Great news: <strong>${escapeHtml(r.company_name)}</strong> is approved as a Tequila Fest USA sponsor.</p>
    ${summaryTable(r)}
    <p>Use the button below to lock in your spot. You can pay in full by card or Zelle, or pay a 10% deposit (${money(depositFor(r.total))}) by card and receive an invoice for the balance.</p>
    ${button(payUrl(r), "Complete Your Sponsorship →")}
    <p style="opacity:.6;font-size:13px">Your spot is held once payment or the deposit is received.</p>`);
}

export function declinedEmail(r: SponsorReservation) {
  return shell("About your sponsorship request", `
    <p>Hi ${escapeHtml(r.contact_name)},</p>
    <p>Thank you for your interest in sponsoring Tequila Fest USA with <strong>${escapeHtml(r.company_name)}</strong>. Unfortunately we aren't able to move forward with this request (${escapeHtml(r.package_name)}, ${escapeHtml(eventsLabel(r.events))}).</p>
    <p>If you'd like to talk about other ways to be involved, just reply to this email.</p>`);
}

export function paidInFullEmail(r: SponsorReservation) {
  return shell("Payment received — you're all set!", `
    <p>Hi ${escapeHtml(r.contact_name)},</p>
    <p>We've received payment in full for <strong>${escapeHtml(r.company_name)}</strong>. Your sponsorship is confirmed.</p>
    ${summaryTable(r)}
    <p>Our team will be in touch with next steps for your activation.</p>
    ${button(payUrl(r), "View Receipt")}`);
}

export function invoiceEmail(r: SponsorReservation, settings: PaymentSettings | null) {
  const balance = r.total - r.amount_paid;
  const due = r.invoice_due_date ? new Date(`${r.invoice_due_date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
  const hasCheck = settings?.check_payable_to && settings?.mailing_address;
  const other = (hasCheck || settings?.zelle_handle) ? `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #2a1a00">
      <h3 style="color:#f5a623;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">Other ways to pay the balance</h3>
      ${settings?.zelle_handle ? `<p style="margin:0 0 12px"><strong>Zelle:</strong> ${escapeHtml(settings.zelle_handle)}</p>` : ""}
      ${hasCheck ? `<p style="margin:0 0 12px;line-height:1.5"><strong>Check</strong> payable to ${escapeHtml(settings!.check_payable_to)}, mailed to:<br>${escapeHtml(settings!.mailing_address).replace(/\n/g, "<br>")}</p>` : ""}
      <p style="opacity:.5;font-size:12px;margin:0">Please put invoice #${escapeHtml(r.invoice_number)} in the memo.</p>
    </div>` : "";
  return shell(`Invoice ${escapeHtml(r.invoice_number)}`, `
    <p>Hi ${escapeHtml(r.contact_name)},</p>
    <p>Thank you! We received your ${money(r.amount_paid)} deposit, and your spot is reserved. Your invoice for the balance is below.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #2a1a00">
      <tr><td style="padding:8px 0">${escapeHtml(r.package_name)} — ${escapeHtml(eventsLabel(r.events))}</td><td style="padding:8px 0;text-align:right">${money(r.total)}</td></tr>
      <tr><td style="padding:8px 0;opacity:.7">Deposit received</td><td style="padding:8px 0;text-align:right;color:#4ade80">−${money(r.amount_paid)}</td></tr>
      <tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #2a1a00">Balance due${due ? ` by ${due}` : ""}</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#f5a623;border-top:1px solid #2a1a00">${money(balance)}</td></tr>
    </table>
    ${button(payUrl(r), "View Invoice / Pay Balance →")}
    ${other}`);
}

// ─── Stripe webhook ──────────────────────────────────────────────────────────

/**
 * checkout.session.completed with metadata.type "sponsor". Each transition is
 * a conditional update on the expected prior status, so a retried webhook is a
 * no-op and the confirmation email goes out exactly once.
 */
export async function handleSponsorCheckoutCompleted(session: {
  id: string;
  amount_total: number | null;
  payment_intent: string | { id: string } | null;
  metadata: Record<string, string> | null;
}): Promise<void> {
  const md = session.metadata || {};
  const reservationId = md.reservation_id;
  const kind = md.kind as "full" | "deposit" | "balance" | undefined;
  const paid = Math.round((session.amount_total ?? 0) / 100);
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (!reservationId || !kind) {
    console.error("[sponsor] webhook missing reservation_id/kind", session.id);
    return;
  }

  const db = sponsorDb();
  const { data: before } = await db.from("sponsor_reservations").select("*").eq("id", reservationId).maybeSingle();
  if (!before) {
    console.error("[sponsor] webhook for unknown reservation", reservationId, session.id);
    return;
  }
  const r0 = before as SponsorReservation;
  const now = new Date().toISOString();
  const common = { stripe_session_id: session.id, stripe_payment_intent_id: paymentIntentId, updated_at: now };

  const expected = kind === "balance" ? "deposit_paid" : "approved";
  let updates: Record<string, unknown>;
  if (kind === "full") {
    updates = { ...common, status: "paid", payment_method: "card", amount_paid: r0.amount_paid + paid, paid_at: now };
  } else if (kind === "deposit") {
    const due = new Date(Date.now() + INVOICE_TERMS_DAYS * 86400000).toISOString().slice(0, 10);
    updates = {
      ...common, status: "deposit_paid", payment_method: "invoice", amount_paid: paid, deposit_amount: paid,
      deposit_paid_at: now, invoice_number: r0.invoice_number || generateInvoiceNumber(), invoice_due_date: due,
    };
  } else {
    updates = { ...common, status: "paid", amount_paid: r0.amount_paid + paid, paid_at: now };
  }

  const { data: after } = await db.from("sponsor_reservations")
    .update(updates).eq("id", reservationId).eq("status", expected).select().maybeSingle();

  if (!after) {
    if ((kind === "balance" ? ["paid"] : ["paid", "deposit_paid"]).includes(r0.status) && r0.stripe_session_id === session.id) return; // retry of a processed event
    // Money was taken but the reservation wasn't in a payable state (e.g. declined in the meantime).
    console.error(`[sponsor] PAYMENT NEEDS REVIEW: ${money(paid)} (${kind}) for reservation ${reservationId} arrived in status "${r0.status}" — session ${session.id}`);
    await db.from("sponsor_reservations").update({
      admin_notes: `${r0.admin_notes ? r0.admin_notes + "\n" : ""}[${now.slice(0, 10)}] Card payment of ${money(paid)} (${kind}) received while status was "${r0.status}". Check Stripe session ${session.id}; may need a refund.`,
      updated_at: now,
    }).eq("id", reservationId);
    return;
  }

  const r = after as SponsorReservation;
  if (kind !== "balance") await markPackageSold(r);
  if (r.status === "paid") {
    await sendSponsorEmail(r.contact_email, "Payment received — your Tequila Fest USA sponsorship is confirmed", paidInFullEmail(r));
  } else {
    await sendSponsorEmail(r.contact_email, `Invoice ${r.invoice_number} — Tequila Fest USA sponsorship`, invoiceEmail(r, await loadPaymentSettings()));
  }
}
