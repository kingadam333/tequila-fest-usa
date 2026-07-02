import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Public — powers the rolling brand scroller on city pages. Only shows brands
// tied to a paid package order or a manually-added brand contact.
export async function GET() {
  const db = supabaseAdmin as any;

  const { data: contacts } = await db
    .from("brand_contacts")
    .select("brands");

  const names = new Set<string>();
  for (const c of contacts || []) {
    for (const b of Array.isArray(c.brands) ? c.brands : []) {
      const name = (b?.name || "").trim();
      if (name) names.add(name);
    }
  }

  return NextResponse.json({ brands: Array.from(names) });
}
