import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { resolveAudience } from "@/lib/campaignAudience";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { audience, cities } = await req.json();

  if (!["vendors", "tickets"].includes(audience) || !Array.isArray(cities) || !cities.length) {
    return NextResponse.json({ error: "audience (vendors|tickets) and at least one city are required" }, { status: 400 });
  }

  const recipients = await resolveAudience(audience, cities);
  return NextResponse.json({ count: recipients.length, sample: recipients.slice(0, 8).map(r => r.email) });
}
