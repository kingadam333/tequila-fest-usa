import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";
import { buildInvoiceEmailHtml } from "@/lib/brandInvoiceEmail";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const db = () => supabaseAdmin as any;

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TFB-${y}${m}-${rand}`;
}

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const url = new URL(req.url);
  const brandId = url.searchParams.get("brand_id");
  let query = db().from("brand_invoices").select("*, brand_contacts(contact_name, contact_email)").order("created_at", { ascending: false });
  if (brandId) query = query.eq("brand_contact_id", brandId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const body = await req.json();
  const { brand_contact_id, event_slug, event_name, line_items, due_date, notes } = body;
  if (!brand_contact_id || !line_items?.length) {
    return NextResponse.json({ error: "brand_contact_id and line_items required" }, { status: 400 });
  }

  const subtotal = line_items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
  const total = subtotal;
  const invoice_number = generateInvoiceNumber();

  // Fetch contact for Stripe
  const { data: contact } = await db().from("brand_contacts").select("contact_name, contact_email").eq("id", brand_contact_id).single();

  // Create Stripe Payment Link — only when something is actually owed.
  // A fully-comped/discounted-to-zero invoice (total <= 0) has nothing to
  // charge, and Stripe requires a positive minimum amount anyway, so skip
  // this entirely rather than let it silently fail.
  let stripe_payment_link_id: string | undefined;
  let stripe_payment_link_url: string | undefined;
  if (total > 0) {
    try {
      const product = await stripe.products.create({
        name: `Tequila Fest USA — ${event_name || "Event"} Brand Fee`,
        metadata: { invoice_number },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(total * 100),
        currency: "usd",
      });
      // metadata.type routes the payment in the Stripe webhook. Without it the
      // session (Payment Links copy their metadata onto it) fell through to the
      // ticket handler, which would have written a phantom ticket order and
      // emailed the brand a ticket, while the invoice stayed unpaid.
      const label = `${contact?.contact_name || "Brand"} — Invoice ${invoice_number}${event_name ? ` (${event_name})` : ""}`;
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { type: "brand_invoice", invoice_number, brand_contact_id },
        payment_intent_data: { description: label, metadata: { type: "brand_invoice", invoice_number } },
        // One payment per invoice — a second click on an old email can't double-charge.
        restrictions: { completed_sessions: { limit: 1 } },
        after_completion: { type: "redirect", redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/brand-invoice-paid?invoice=${invoice_number}` } },
      });
      stripe_payment_link_id = link.id;
      stripe_payment_link_url = link.url;
    } catch (e) {
      console.error("Stripe payment link error:", e);
    }
  }

  const { data, error } = await db()
    .from("brand_invoices")
    .insert({
      brand_contact_id,
      invoice_number,
      event_slug,
      event_name,
      line_items,
      subtotal,
      total,
      status: "draft",
      stripe_payment_link_id,
      stripe_payment_link_url,
      due_date,
      notes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send invoice email if contact email exists — a payment link is only
  // present when something is actually owed (see above), so the template
  // renders without a "Pay Online" button for a fully-comped invoice.
  if (contact?.contact_email) {
    try {
      const { resend } = await import("@/lib/resend");
      const { data: paymentSettings } = await db().from("invoice_payment_settings").select("*").limit(1).maybeSingle();
      const sent = await (resend as any).emails.send({
        from: "Tequila Fest USA Brands <brands@mail.tequilafestusa.com>",
        to: contact.contact_email,
        subject: `Invoice ${invoice_number} — ${event_name || "Tequila Fest USA"}`,
        html: buildInvoiceEmailHtml({ contact_name: contact.contact_name, invoice_number, event_name, line_items, total, due_date, payment_url: stripe_payment_link_url, paymentSettings }),
      });
      // The list showed every emailed invoice as "draft"; mark it sent. Resend
      // reports failures as { error } rather than throwing.
      if (sent?.error) console.error("Invoice email send error:", sent.error);
      else await db().from("brand_invoices").update({ status: "sent", updated_at: new Date().toISOString() }).eq("id", data.id).eq("status", "draft");
    } catch (e) {
      console.error("Invoice email send error:", e);
    }
  }

  return NextResponse.json({ invoice: data });
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data, error } = await db().from("brand_invoices").update(fields).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
