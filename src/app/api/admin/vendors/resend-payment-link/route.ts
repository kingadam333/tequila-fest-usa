import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVendorApprovalEmail } from "../route";

// Re-creates the Stripe payment link + resends the approval email for a
// vendor that's already approved — used both for one-off resends and to fix
// the batch of vendors whose link/email silently failed to send before the
// Stripe expires_at bug was fixed (every approval prior to that fix has
// payment_link = null).
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = supabaseAdmin as any;
  const { data: app } = await db.from("vendor_applications").select("*").eq("id", id).single();
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  try {
    const url = await sendVendorApprovalEmail(db, app);
    return NextResponse.json({ ok: true, payment_link: url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to resend payment link" }, { status: 500 });
  }
}
