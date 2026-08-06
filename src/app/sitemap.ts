import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tequilafestusa.com";

// Regenerate hourly so events added/completed in admin appear (or drop out) without
// a redeploy — same convention as the homepage event cards.
export const revalidate = 3600;

// Public, indexable routes only. Gated routes (admin/account/checkin/auth) and the
// post-payment confirmation pages are deliberately absent, and also blocked in robots.ts.
const STATIC_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/brand-packages", priority: 0.8, changeFrequency: "monthly" },
  { path: "/vendors", priority: 0.8, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/sponsors", priority: 0.6, changeFrequency: "monthly" },
  { path: "/affiliates", priority: 0.6, changeFrequency: "monthly" },
  { path: "/press", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/loadin", priority: 0.4, changeFrequency: "weekly" },
  { path: "/earn-points", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Event pages use permanent city slugs (/events/cincinnati resolves to whatever the
  // current/next event for that city is), so these URLs are stable year to year.
  // Imported lazily and wrapped so a missing Supabase env can never break the sitemap —
  // the static routes still ship if this fails.
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const today = now.toISOString().split("T")[0];

    const { data: events } = await db
      .from("events")
      .select("slug, date_iso")
      .gte("date_iso", today)
      .not("status", "in", '("draft","cancelled","completed")')
      .order("date_iso", { ascending: true });

    const seen = new Set<string>();
    for (const e of events || []) {
      if (!e?.slug || seen.has(e.slug)) continue;
      seen.add(e.slug);
      entries.push({
        url: `${SITE}/events/${e.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }
  } catch {
    // Sitemap must never take the site down; fall back to static routes.
  }

  for (const post of POSTS) {
    const published = new Date(post.publishedAt);
    entries.push({
      url: `${SITE}/blog/${post.slug}`,
      lastModified: Number.isNaN(published.getTime()) ? now : published,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
