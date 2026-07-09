import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { createVendorPaymentSession } from "../route";

// Creates a fresh Stripe payment link WITHOUT sending any email — just
// returns the URL so admin can copy/paste it directly (e.g. into a personal
// email thread or text), bypassing Resend entirely. Useful when a vendor's
// corporate spam filter pre-opens/clicks links from automated sends before
// the human ever sees them, burning through the single-use Stripe session.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: app } = await db.from("vendor_applications").select("*").eq("id", id).single();
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  try {
    const { session } = await createVendorPaymentSession(app);
    await db.from("vendor_applications").update({ payment_link: session.url }).eq("id", id);
    return NextResponse.json({ ok: true, payment_link: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate payment link" }, { status: 500 });
  }
}
