import { supabaseAdmin } from "@/lib/supabase";

// Unique clicks = distinct visitor_id per short_link_id, computed live
// (never stored as a running counter) — same "recompute, don't trust a
// counter" rule this project uses everywhere else. Rows logged before the
// tf_visitor cookie existed have a null visitor_id and are excluded, so
// unique counts only reflect clicks captured since that shipped (total
// `clicks` on short_links is unaffected and still includes everything).
export async function getUniqueClickCounts(shortLinkIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!shortLinkIds.length) return counts;

  const db = supabaseAdmin as any;
  const { data } = await db
    .from("short_link_clicks")
    .select("short_link_id, visitor_id")
    .in("short_link_id", shortLinkIds)
    .not("visitor_id", "is", null);

  const seen = new Map<string, Set<string>>();
  for (const row of data || []) {
    const set = seen.get(row.short_link_id) || new Set<string>();
    set.add(row.visitor_id);
    seen.set(row.short_link_id, set);
  }
  for (const [id, set] of seen) counts.set(id, set.size);
  return counts;
}
