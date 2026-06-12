import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_VENDORS } from "@/lib/resend";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("vendor_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data });
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id, status, admin_notes } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabaseAdmin as any;

  // Fetch the application
  const { data: app } = await db.from("vendor_applications").select("*").eq("id", id).single();
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const updates: any = { status, updated_at: new Date().toISOString() };
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;

  // On approval — create a Stripe Checkout payment link for $150/city
  if (status === "approved" && app.status !== "approved") {
    const cityCount = app.cities?.length || 1;
    const amount = 150 * cityCount; // $150 per city

    try {
      // Build one line item per city at $150 each
      const cityList: string[] = app.cities?.length ? app.cities : ["Festival"];
      const lineItems = cityList.map((city: string) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Vendor - ${city}`,
            description: `${app.business_name} · Tequila Fest USA ${city}`,
          },
          unit_amount: 15000, // $150 per city
        },
        quantity: 1,
      }));

      // Create a Stripe Checkout Session (expires in 7 days)
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        customer_email: app.email,
        metadata: { vendor_application_id: id, business_name: app.business_name },
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://tequilafestusa.com"}/vendor-payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://tequilafestusa.com"}/vendors`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      });

      updates.payment_link = session.url;

      // Send approval email with payment link
      await resend.emails.send({
        from: FROM_VENDORS,
        to: app.email,
        subject: `You're Approved! Complete Your Vendor Registration — Tequila Fest USA`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA</p>

  <div style="background:linear-gradient(135deg,rgba(245,166,35,0.15),rgba(245,166,35,0.05));border:1px solid rgba(245,166,35,0.3);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center">
    <p style="font-size:40px;margin:0 0 12px">🎉</p>
    <h1 style="font-size:26px;font-weight:900;color:#F5A623;letter-spacing:2px;margin:0 0 8px">YOU'RE APPROVED!</h1>
    <p style="color:rgba(255,248,240,0.7);font-size:15px;margin:0;line-height:1.6">
      Congratulations, <strong>${app.name}</strong>! <strong>${app.business_name}</strong> has been approved as a vendor for Tequila Fest USA.
    </p>
  </div>

  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:22px;margin-bottom:24px">
    <p style="font-size:11px;font-weight:700;letter-spacing:3px;color:#F5A623;margin:0 0 14px">YOUR DETAILS</p>
    <table style="width:100%;font-size:14px;border-collapse:collapse">
      <tr><td style="color:rgba(255,248,240,0.45);padding:5px 0;width:40%">Business</td><td style="color:#fff8f0;font-weight:600">${app.business_name}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.45);padding:5px 0">Type</td><td style="color:#fff8f0">${app.vendor_type}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.45);padding:5px 0">Cities</td><td style="color:#fff8f0">${app.cities?.join(", ") || "TBD"}</td></tr>
      <tr><td style="color:rgba(255,248,240,0.45);padding:5px 0">Vendor Fee</td><td style="color:#F5A623;font-weight:700">$${amount} (${cityCount} city × $150)</td></tr>
    </table>
  </div>

  <div style="background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.2);border-radius:14px;padding:22px;margin-bottom:24px">
    <p style="font-weight:700;color:#fff8f0;margin:0 0 8px">Next Step: Complete Your Payment</p>
    <p style="color:rgba(255,248,240,0.55);font-size:14px;margin:0 0 18px;line-height:1.6">
      To secure your spot, please complete your vendor fee payment. This link expires in <strong>7 days</strong>.
    </p>
    <div style="text-align:center">
      <a href="${session.url}"
        style="display:inline-block;background:#F5A623;color:#000;font-weight:900;font-size:15px;letter-spacing:1px;padding:14px 36px;border-radius:50px;text-decoration:none">
        PAY VENDOR FEE — $${amount}
      </a>
    </div>
  </div>

  <p style="color:rgba(255,248,240,0.3);font-size:12px;text-align:center;line-height:1.8">
    Questions? Reply to this email or contact <a href="mailto:partners@tequilafestusa.com" style="color:#F5A623">partners@tequilafestusa.com</a>
  </p>
</div></body></html>`,
      });
    } catch (err: any) {
      console.error("Stripe/email error on vendor approval:", err);
    }
  }

  // On rejection — send a polite decline email
  if (status === "rejected" && app.status !== "rejected") {
    resend.emails.send({
      from: FROM_VENDORS,
      to: app.email,
      subject: `Vendor Application Update — Tequila Fest USA`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA</p>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
    <p style="font-size:18px;font-weight:700;color:#fff8f0;margin:0 0 12px">Application Update</p>
    <p style="color:rgba(255,248,240,0.6);line-height:1.7;margin:0 0 12px">
      Hi ${app.name}, thank you for your interest in vending at Tequila Fest USA.
      After review, we are unable to approve <strong>${app.business_name}</strong> for this cycle.
    </p>
    ${admin_notes ? `<p style="color:rgba(255,248,240,0.5);font-size:14px;margin:0 0 12px">Note: ${admin_notes}</p>` : ""}
    <p style="color:rgba(255,248,240,0.4);font-size:14px;margin:0">
      We encourage you to apply again for future events. Thank you for your understanding.
    </p>
  </div>
  <p style="color:rgba(255,248,240,0.25);font-size:12px;text-align:center;margin-top:24px">
    <a href="mailto:partners@tequilafestusa.com" style="color:#F5A623">partners@tequilafestusa.com</a>
  </p>
</div></body></html>`,
    }).catch(() => {});
  }

  const { data, error } = await db
    .from("vendor_applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}
