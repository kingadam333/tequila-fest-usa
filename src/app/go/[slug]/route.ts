import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

// Custom short links for QR codes / marketing — /go/<slug> redirects to
// whatever destination the admin set, and bumps a click counter along the
// way (best-effort, not transactionally safe, but fine for a marketing
// click count — not a billing-critical number).
//
// Every hit counts toward `clicks` (total, including repeat visits) — a
// separate "unique" figure is computed elsewhere as distinct visitor_id
// values in short_link_clicks. The visitor_id itself comes from a 1-year
// "tf_visitor" cookie: same browser clicking 5 times is 5 clicks but 1
// unique; a stable device fingerprint, not personal data, and used only
// for this dedup — not tied to any account or PII.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin as any;

  const { data } = await db.from("short_links").select("id, destination_url, clicks, affiliate_id").eq("slug", slug).maybeSingle();
  if (!data) return NextResponse.redirect(new URL("/", req.url));

  let visitorId = req.cookies.get("tf_visitor")?.value;
  const isNewVisitor = !visitorId;
  if (!visitorId) visitorId = crypto.randomUUID();

  db.from("short_links").update({ clicks: (data.clicks || 0) + 1 }).eq("id", data.id).then(() => {});
  db.from("short_link_clicks").insert({ short_link_id: data.id, visitor_id: visitorId }).then(() => {});

  const res = NextResponse.redirect(data.destination_url);

  if (isNewVisitor) {
    res.cookies.set("tf_visitor", visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  // Affiliate links carry attribution via a long-lived cookie rather than a
  // query param, since the destination can be any page and the buyer might
  // browse elsewhere (e.g. a different city) before actually checking out.
  if (data.affiliate_id) {
    const { data: affiliate } = await db.from("affiliates").select("referral_code").eq("id", data.affiliate_id).maybeSingle();
    if (affiliate?.referral_code) {
      res.cookies.set("tf_aff", affiliate.referral_code, {
        maxAge: 60 * 60 * 24 * 90,
        path: "/",
        sameSite: "lax",
      });
    }
  }

  return res;
}
