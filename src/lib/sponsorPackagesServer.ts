// Server-only: reads the sponsor packages shown on /brand-packages and /sponsors.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import type { SponsorPackage } from "@/lib/sponsorPackages";

// null = couldn't load (callers fall back rather than render an empty list);
// [] = loaded, and the admin has hidden every package.
export async function loadActiveSponsorPackages(): Promise<SponsorPackage[] | null> {
  try {
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data, error } = await db
      .from("sponsor_packages")
      .select("id, name, price_per_event, blurb, features, sold_events, per_city, slots_per_event, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[sponsor-packages] load failed:", error.message);
      return null;
    }
    return (data as SponsorPackage[]) || [];
  } catch (err) {
    console.error("[sponsor-packages] load failed:", err);
    return null;
  }
}
