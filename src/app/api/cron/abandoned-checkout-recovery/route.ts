import { NextRequest, NextResponse } from "next/server";
import { sendAbandonedCheckoutRecovery } from "@/lib/abandonedCheckouts";

// Vercel cron hits this every Wednesday evening (see vercel.json). Auth via
// CRON_SECRET (Vercel sets `Authorization: Bearer $CRON_SECRET`). Manual
// trigger from admin uses the x-admin-token header.
function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken && adminToken === process.env.ADMIN_PASSWORD) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await sendAbandonedCheckoutRecovery();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
