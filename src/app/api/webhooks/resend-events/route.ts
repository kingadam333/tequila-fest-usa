import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Resend outbound email lifecycle webhook — tracks sent/delivered/opened/
// clicked/bounced for the vendor approval email so admin can see whether a
// vendor ever actually received (or opened) their payment link, instead of
// approvals silently going nowhere. Matches events back to a
// vendor_applications row via the Resend email id stored at send time
// (approval_email_id).
//
// Resend webhook config needed: Dashboard → Webhooks → add endpoint
// `https://www.tequilafestusa.com/api/webhooks/resend-events`, subscribed to
// email.delivered, email.delivery_delayed, email.opened, email.clicked,
// email.bounced, email.complained. Open/click tracking must also be enabled
// on the sending domain (Resend → Domains → tequilafestusa.com → Tracking).
export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const type: string = payload?.type || "";
  const emailId: string | undefined = payload?.data?.email_id;
  if (!emailId) return NextResponse.json({ skipped: "no email_id" });

  const db = supabaseAdmin as any;
  const { data: app } = await db
    .from("vendor_applications")
    .select("id, approval_email_open_count, approval_email_click_count")
    .eq("approval_email_id", emailId)
    .maybeSingle();

  if (!app) return NextResponse.json({ skipped: "no matching vendor_applications row" });

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  switch (type) {
    case "email.delivered":
      updates.approval_email_delivered_at = now;
      break;
    case "email.opened":
      updates.approval_email_opened_at = now;
      updates.approval_email_open_count = (app.approval_email_open_count || 0) + 1;
      break;
    case "email.clicked":
      updates.approval_email_clicked_at = now;
      updates.approval_email_click_count = (app.approval_email_click_count || 0) + 1;
      break;
    case "email.bounced":
    case "email.complained":
      updates.approval_email_bounced_at = now;
      break;
    default:
      return NextResponse.json({ skipped: `unhandled type: ${type}` });
  }

  await db.from("vendor_applications").update(updates).eq("id", app.id);
  return NextResponse.json({ received: true });
}
