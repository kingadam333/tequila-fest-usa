import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import EventPage from "./EventPage";
import type { EventData } from "@/lib/events";

export const dynamic = "force-dynamic";

// Visual theming keyed by city name (lowercase) — never changes year to year
const CITY_STYLE: Record<string, Partial<EventData>> = {
  cincinnati: { color: "#F5A623", gradient: "from-yellow-900/60 to-orange-950/80", border: "border-yellow-500/30", tag: "Flagship City",   emoji: "🏙️" },
  cleveland:  { color: "#C8102E", gradient: "from-red-900/60 to-rose-950/80",      border: "border-red-500/30",    tag: "Lake Erie Edition", emoji: "🌊" },
  columbus:   { color: "#00A878", gradient: "from-emerald-900/60 to-teal-950/80",  border: "border-emerald-500/30", tag: "Capital City",     emoji: "🌿", foodVendor: { name: "2 Specialty Tacos", ticketNote: "From Condado Tacos" } },
  phoenix:    { color: "#7B2FBE", gradient: "from-purple-900/60 to-violet-950/80", border: "border-purple-500/30",  tag: "Desert Edition",   emoji: "🌵" },
};

// Resolve a URL slug like "cincinnati" or "cincinnati-2027" to a base city key
function cityKey(slug: string): string {
  return slug.split("-")[0].toLowerCase();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin as any;
  const today = new Date().toISOString();

  const { data } = await db
    .from("events")
    .select("city, date, description")
    .ilike("city", `%${cityKey(slug)}%`)
    .gte("date_iso", today)
    .not("status", "in", '("draft","cancelled","completed")')
    .order("date_iso", { ascending: true })
    .limit(1)
    .single();

  if (!data) return { title: "Tequila Fest USA" };
  return {
    title: `Tequila Fest ${data.city} — ${data.date}`,
    description: data.description,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = supabaseAdmin as any;
  const today = new Date().toISOString();
  const key = cityKey(slug);

  // Find the current/next upcoming event for this city
  const { data: dbEvent } = await db
    .from("events")
    .select("*")
    .ilike("city", `%${key}%`)
    .gte("date_iso", today)
    .not("status", "in", '("draft","cancelled")')
    .order("date_iso", { ascending: true })
    .limit(1)
    .single();

  // Fallback: if nothing upcoming, grab the most recent (completed) event so the page doesn't 404
  const { data: fallback } = !dbEvent ? await db
    .from("events")
    .select("*")
    .ilike("city", `%${key}%`)
    .order("date_iso", { ascending: false })
    .limit(1)
    .single() : { data: null };

  const ev = dbEvent || fallback;
  if (!ev) notFound();

  const style = CITY_STYLE[key] || {};

  // Build an EventData-shaped object from DB + static style
  const event: EventData = {
    slug,                                                  // keep the URL slug permanent
    city: ev.city,
    state: ev.state || "",
    date: ev.date || "Date TBD",
    dateISO: ev.date_iso || new Date().toISOString(),
    time: ev.time || "3:00 PM – 9:00 PM",
    venue: ev.venue || "",
    venueDetail: ev.venue_detail || "",
    venueAddress: ev.venue_address || "",
    description: ev.description || "",
    price: 55,
    gaTicket: null,        // GA config stays static for now; ticket types come from DB via liveTypes
    freeParking: ev.free_parking ?? false,
    color: style.color || ev.color || "#F5A623",
    gradient: style.gradient || "from-yellow-900/60 to-orange-950/80",
    border: style.border || "border-white/20",
    tag: style.tag || ev.tag || "",
    emoji: style.emoji || ev.emoji || "🥃",
    foodVendor: style.foodVendor,
  };

  return (
    <EventPage
      event={event}
      ogImage={ev.og_image || null}
      dbStatus={ev.status || null}
    />
  );
}
