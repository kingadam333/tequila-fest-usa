import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Public — powers the rolling brand scroller on city pages. Only shows
// brands with a *paid* package order — optionally scoped to one city.
export async function GET(req: NextRequest) {
  const db = supabaseAdmin as any;
  const city = new URL(req.url).searchParams.get("city")?.toLowerCase() || "";

  const { data: orders } = await db
    .from("brand_package_orders")
    .select("brand_name, cities")
    .eq("status", "paid");

  const names = new Set<string>();
  for (const o of orders || []) {
    const cities: string[] = Array.isArray(o.cities) ? o.cities : [];
    if (city && !cities.map((c: string) => c.toLowerCase()).includes(city)) continue;
    const name = (o.brand_name || "").trim();
    if (name) names.add(name);
  }

  return NextResponse.json({ brands: Array.from(names) });
}
