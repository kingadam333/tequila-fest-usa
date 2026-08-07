import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";
import { wrapEmailHtml } from "@/lib/emailLayout";

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
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoice_number, brand_contact_id },
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
      await (resend as any).emails.send({
        from: "Tequila Fest USA Brands <brands@mail.tequilafestusa.com>",
        to: contact.contact_email,
        subject: `Invoice ${invoice_number} — ${event_name || "Tequila Fest USA"}`,
        html: buildInvoiceEmailHtml({ contact_name: contact.contact_name, invoice_number, event_name, line_items, total, due_date, payment_url: stripe_payment_link_url, paymentSettings }),
      });
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

interface InvoicePaymentSettings {
  check_payable_to: string | null;
  mailing_address: string | null;
  zelle_handle: string | null;
  zelle_qr_url: string | null;
}

function buildInvoiceEmailHtml({ contact_name, invoice_number, event_name, line_items, total, due_date, payment_url, paymentSettings }: {
  contact_name: string; invoice_number: string; event_name?: string; line_items: { description: string; quantity: number; unit_price: number; total: number }[];
  total: number; due_date?: string; payment_url?: string; paymentSettings?: InvoicePaymentSettings | null;
}) {
  const hasCheck = paymentSettings?.check_payable_to && paymentSettings?.mailing_address;
  const hasZelle = paymentSettings?.zelle_handle;
  const otherWaysToPay = (hasCheck || hasZelle) ? `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2a1a00">
      <h3 style="color:#f5a623;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px">Other Ways to Pay</h3>
      <div style="display:block">
        ${hasCheck ? `
        <div style="margin-bottom:${hasZelle ? "20px" : "0"}">
          <p style="color:#fff8f0;font-weight:bold;margin:0 0 4px">Pay by Check</p>
          <p style="color:#fff8f0;opacity:0.7;margin:0;line-height:1.5">
            Make payable to: <strong>${paymentSettings!.check_payable_to}</strong><br>
            Mail to:<br>${paymentSettings!.mailing_address!.replace(/\n/g, "<br>")}
          </p>
        </div>` : ""}
        ${hasZelle ? `
        <div>
          <p style="color:#fff8f0;font-weight:bold;margin:0 0 4px">Pay by Zelle</p>
          <p style="color:#fff8f0;opacity:0.7;margin:0 0 12px">Send to: <strong>${paymentSettings!.zelle_handle}</strong></p>
          ${paymentSettings?.zelle_qr_url ? `<img src="${paymentSettings.zelle_qr_url}" width="160" height="160" alt="Zelle QR code" style="border-radius:8px;border:1px solid #2a1a00" />` : ""}
        </div>` : ""}
      </div>
      <p style="color:#fff8f0;opacity:0.4;font-size:12px;margin:16px 0 0">Paying by check or Zelle? Please include invoice #${invoice_number} as a note/memo, and let us know at brands@mail.tequilafestusa.com so we can mark it received.</p>
    </div>` : "";
  // Negative-total rows are discounts/comps — shown in green with a minus
  // sign so a contact billed for 3 of 5 brands (say) can see all 5 listed
  // and exactly what was waived, not just a smaller total with no context.
  const rows = line_items.map(item => {
    const isDiscount = item.total < 0;
    const isComp = item.total === 0 && item.unit_price === 0;
    const amountColor = isDiscount ? "#4ade80" : "#f5a623";
    const amountText = isDiscount ? `−$${Math.abs(item.total).toFixed(2)}` : `$${item.total.toFixed(2)}`;
    return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:#fff8f0">${item.description}${isComp ? ` <span style="color:#4ade80;font-size:11px;font-weight:bold;text-transform:uppercase">(Comp)</span>` : ""}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:#fff8f0;text-align:center">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:#fff8f0;text-align:right">$${item.unit_price.toFixed(2)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a1a00;color:${amountColor};text-align:right;font-weight:bold">${amountText}</td>
    </tr>`;
  }).join("");
  return wrapEmailHtml(`
    <h1 style="color:#f5a623;font-size:28px;margin:0 0 4px">TEQUILA FEST USA</h1>
    <p style="color:#fff8f0;opacity:0.5;margin:0 0 32px">Brand Invoice</p>
    <h2 style="color:#fff;margin:0 0 8px">Invoice #${invoice_number}</h2>
    ${event_name ? `<p style="color:#f5a623;margin:0 0 24px">${event_name}</p>` : ""}
    <p style="margin:0 0 24px">Hi ${contact_name},<br><br>Please find your invoice below.${payment_url ? " Use the button to pay securely online via Stripe." : ""}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead><tr>
        <th style="text-align:left;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #f5a623">Description</th>
        <th style="text-align:center;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #f5a623">Qty</th>
        <th style="text-align:right;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #f5a623">Unit Price</th>
        <th style="text-align:right;color:#f5a623;font-size:12px;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #f5a623">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:right;margin-top:16px;font-size:20px;font-weight:bold;color:#f5a623">Total: $${total.toFixed(2)}</div>
    ${due_date && payment_url ? `<p style="color:#fff8f0;opacity:0.6;text-align:right;font-size:13px">Due: ${due_date}</p>` : ""}
    ${payment_url ? `
    <div style="text-align:center;margin:40px 0">
      <a href="${payment_url}" style="background:#f5a623;color:#0d0500;font-weight:bold;font-size:16px;padding:16px 40px;border-radius:8px;text-decoration:none;display:inline-block">Pay Invoice Online →</a>
    </div>` : `
    <div style="text-align:center;margin:40px 0;padding:16px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.25);border-radius:12px">
      <p style="color:#4ade80;font-weight:bold;margin:0">No payment due — this invoice is fully comped.</p>
    </div>`}
    ${otherWaysToPay}
    <p style="color:#fff8f0;opacity:0.6;font-size:12px;text-align:center;margin-top:32px">Tequila Fest USA · brands@mail.tequilafestusa.com</p>`, { maxWidth: 600 });
}
