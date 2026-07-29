import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";

// One-time diagnostic: reports which marketing-sync env vars are actually
// set in this environment — booleans only, never the real values — so we
// can confirm all 4 cities are wired to Brevo/TextMagic without guessing.
const VARS = [
  "BREVO_API_KEY",
  "BREVO_LIST_ID_CINCINNATI", "BREVO_LIST_ID_CLEVELAND", "BREVO_LIST_ID_COLUMBUS", "BREVO_LIST_ID_PHOENIX",
  "TEXTMAGIC_USERNAME", "TEXTMAGIC_API_KEY",
  "TEXTMAGIC_LIST_ID_CINCINNATI", "TEXTMAGIC_LIST_ID_CLEVELAND", "TEXTMAGIC_LIST_ID_COLUMBUS", "TEXTMAGIC_LIST_ID_PHOENIX",
];

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const result: Record<string, boolean> = {};
  for (const key of VARS) result[key] = !!process.env[key]?.trim();
  return NextResponse.json(result);
}
