import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateShortCode } from "@/lib/shortCode";

// Swaps an affiliate's referral_code + short_link slug for a fresh random
// one — for name-derived legacy codes (a privacy issue: the old codes were
// slugified from the affiliate's name, e.g. "adam-bossin") or if a code
// leaked/was shared somewhere it shouldn't have been. The short_link row
// itself is kept (same id, same click history) — only its slug changes, so
// any already-printed old link/QR code stops working after this.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  let code = generateShortCode();
  for (let i = 0; i < 5; i++) {
    const [{ data: codeTaken }, { data: slugTaken }] = await Promise.all([
      db.from("affiliates").select("id").eq("referral_code", code).maybeSingle(),
      db.from("short_links").select("id").eq("slug", code).maybeSingle(),
    ]);
    if (!codeTaken && !slugTaken) break;
    code = generateShortCode();
  }

  const { error: affError } = await db.from("affiliates").update({ referral_code: code }).eq("id", id);
  if (affError) return NextResponse.json({ error: affError.message }, { status: 500 });

  const { error: linkError } = await db.from("short_links").update({ slug: code }).eq("affiliate_id", id);
  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tequilafestusa.com";
  return NextResponse.json({ slug: code, refLink: `${siteUrl}/go/${code}` });
}
