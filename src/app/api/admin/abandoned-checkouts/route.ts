import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { getAbandonedCheckoutGroups } from "@/lib/abandonedCheckouts";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  try {
    const groups = await getAbandonedCheckoutGroups();
    return NextResponse.json({
      groups: groups.map(g => ({ eventSlug: g.eventSlug, city: g.city, count: g.recipients.length })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load abandoned checkouts" }, { status: 500 });
  }
}
