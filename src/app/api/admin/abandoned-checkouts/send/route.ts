import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { sendAbandonedCheckoutRecovery } from "@/lib/abandonedCheckouts";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { eventSlug } = await req.json().catch(() => ({ eventSlug: undefined }));
  try {
    const result = await sendAbandonedCheckoutRecovery(eventSlug || undefined);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to send" }, { status: 500 });
  }
}
