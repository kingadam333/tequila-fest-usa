import { NextRequest, NextResponse } from "next/server";
import { sendAbandonedCheckoutRecovery } from "@/lib/abandonedCheckouts";
import { authorizeCron } from "@/lib/cronAuth";

// Vercel cron hits this every Wednesday evening (see vercel.json). Auth via
// CRON_SECRET (Vercel sets `Authorization: Bearer $CRON_SECRET`). Manual
// trigger from admin uses the x-admin-token header.

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req, "abandoned-checkout-recovery");
  if (denied) return denied;
  try {
    const result = await sendAbandonedCheckoutRecovery();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
