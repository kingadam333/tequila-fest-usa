import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const targets = [
    { id: "pi_3TvknMLyuw3Oooiq1FiJYzZZ", desc: "Vendor - Cleveland (Hawk)" },
    { id: "pi_3TvjFLLyuw3Oooiq1Bvdb6kQ", desc: "Vendor - Cleveland (LT Squared)" },
  ];
  const results: any[] = [];
  for (const t of targets) {
    try {
      await stripe.paymentIntents.update(t.id, { description: t.desc });
      results.push({ id: t.id, ok: true });
    } catch (e: any) {
      results.push({ id: t.id, ok: false, error: e?.message });
    }
  }
  return NextResponse.json({ results });
}
