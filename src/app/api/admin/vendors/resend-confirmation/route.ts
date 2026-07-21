import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_VENDORS, vendorConfirmationHtml } from "@/lib/resend";

// Resends the post-payment vendor confirmation email (order #, QR, vendor
// reminders) — for vendors who already paid but got the wrong email (e.g.
// the ticket-purchase email, from before vendor payments had their own
// handler), or who just want it resent.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: app } = await db.from("vendor_applications").select("*").eq("id", id).single();
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!app.paid || !app.order_number || !app.qr_code) {
    return NextResponse.json({ error: "This vendor has no recorded payment (order_number/qr_code missing) — nothing to resend" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const firstName = (app.name || "").split(" ")[0] || "there";

  try {
    await resend.emails.send({
      from: FROM_VENDORS,
      to: app.email,
      subject: `You're Confirmed! Vendor Spot Payment Received — ${app.order_number}`,
      html: vendorConfirmationHtml({
        firstName,
        businessName: app.business_name,
        cities: app.cities?.length ? app.cities : ["Festival"],
        orderNumber: app.order_number,
        total: 150 * (app.cities?.length || 1),
        qrCode: app.qr_code,
        appUrl,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to resend confirmation" }, { status: 500 });
  }
}
