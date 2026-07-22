import { supabaseAdmin } from "@/lib/supabase";
import LoadInPageClient, { type LoadInEvent } from "./LoadInPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Load-In Info — Tequila Fest USA",
  description: "Load-in times, venue map, and event details for Tequila Fest USA vendors and food trucks.",
};

export default async function Page() {
  const db = supabaseAdmin as any;

  const { data } = await db
    .from("events")
    .select("id, slug, city, state, date, time, venue, venue_detail, venue_address, load_in_start, load_in_end, load_in_notes, load_in_map_url, sort_order, status")
    .not("status", "in", '("draft","cancelled")')
    .order("sort_order", { ascending: true });

  const events: LoadInEvent[] = (data || []).map((e: any) => ({
    id: e.id,
    slug: e.slug,
    city: e.city,
    state: e.state || "",
    date: e.date || "Date TBD",
    time: e.time || "",
    venue: e.venue || "",
    venueDetail: e.venue_detail || "",
    venueAddress: e.venue_address || "",
    loadInStart: e.load_in_start || "",
    loadInEnd: e.load_in_end || "",
    loadInNotes: e.load_in_notes || "",
    mapUrl: e.load_in_map_url || "",
  }));

  return <LoadInPageClient events={events} />;
}
