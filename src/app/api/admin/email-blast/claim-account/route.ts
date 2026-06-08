import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_EMAIL, claimAccountHtml } from "@/lib/resend";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const db = supabaseAdmin as any;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  const signupUrl = `${appUrl}/signup`;

  // Get all paid ticket buyers with no account, aggregated by email
  const { data: buyers, error } = await db.rpc("get_unregistered_buyers");
  if (error) {
    // Fallback query if function doesn't exist yet
    return NextResponse.json({ error: "DB function not ready: " + error.message }, { status: 500 });
  }

  if (!buyers || buyers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No unregistered buyers found" });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Resend allows batch sending up to 100 at a time
  const BATCH_SIZE = 50;
  for (let i = 0; i < buyers.length; i += BATCH_SIZE) {
    const batch = buyers.slice(i, i + BATCH_SIZE);
    const emails = batch.map((b: any) => ({
      from: FROM_EMAIL,
      to: b.email,
      subject: `🏆 You have ${b.points} loyalty points waiting — claim them now!`,
      html: claimAccountHtml({
        firstName: b.first_name || b.customer_name?.split(" ")[0] || "there",
        signupUrl,
        points: b.points,
      }),
    }));

    try {
      const result = await resend.batch.send(emails);
      const batchData = result?.data as any;
      if (Array.isArray(batchData)) {
        sent += batchData.length;
      } else {
        sent += batch.length;
      }
    } catch (err: any) {
      failed += batch.length;
      errors.push(err.message || String(err));
    }
  }

  return NextResponse.json({ sent, failed, total: buyers.length, errors: errors.length ? errors : undefined });
}
