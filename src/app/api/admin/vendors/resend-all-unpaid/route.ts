import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { sendVendorApprovalEmail } from "../route";

// Bulk version of resend-payment-link — resends to every approved vendor
// who hasn't paid yet. Each vendor gets its own fresh Stripe session (fixed
// expiry + metadata), so this is also the fix for any vendor still holding
// a stale pre-fix link.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const db = supabaseAdmin as any;
  const { data: apps, error } = await db
    .from("vendor_applications")
    .select("*")
    .eq("status", "approved")
    .eq("paid", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!apps?.length) return NextResponse.json({ ok: true, sent: 0, failed: [] });

  const failed: { id: string; business_name: string; error: string }[] = [];
  let sent = 0;

  for (const app of apps) {
    try {
      await sendVendorApprovalEmail(db, app);
      sent++;
    } catch (err: any) {
      failed.push({ id: app.id, business_name: app.business_name, error: err?.message || "Unknown error" });
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
