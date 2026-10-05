import type { Metadata } from "next";
import BrandPackagesPage from "./BrandPackagesPage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import type { SponsorPackage } from "@/lib/sponsorPackages";

export const metadata: Metadata = {
  title: "Brand Packages | Tequila Fest USA",
  description:
    "Showcase your tequila brand to thousands of fans across 4 U.S. festival cities. Pour, sample, and sell with curated brand packages designed for visibility and ROI.",
};

// Rendered per request so sold/available changes made in admin -> Sponsors
// show up immediately rather than after a rebuild.
export const dynamic = "force-dynamic";

// null = couldn't load (the page falls back to its built-in list);
// [] = loaded, and the admin has hidden every package.
async function loadSponsorPackages(): Promise<SponsorPackage[] | null> {
  try {
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data, error } = await db
      .from("sponsor_packages")
      .select("id, name, price_per_event, blurb, features, sold_events, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[brand-packages] sponsor_packages load failed:", error.message);
      return null;
    }
    return data || [];
  } catch (err) {
    console.error("[brand-packages] sponsor_packages load failed:", err);
    return null;
  }
}

export default async function Page() {
  return <BrandPackagesPage sponsorPackages={await loadSponsorPackages()} />;
}
