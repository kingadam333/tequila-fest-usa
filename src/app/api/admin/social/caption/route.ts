import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { generateCaption } from "@/lib/social/captions";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const body = await req.json();
  try {
    const caption = await generateCaption({
      type: body.type || "manual",
      city: body.city,
      brandName: body.brandName,
      platform: body.platform || "both",
      hint: body.hint,
      tone: body.tone,
    });
    return NextResponse.json({ caption });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
