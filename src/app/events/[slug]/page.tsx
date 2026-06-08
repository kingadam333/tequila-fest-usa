import { notFound } from "next/navigation";
import { getEvent, EVENTS } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase";
import EventPage from "./EventPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return {};
  return {
    title: `Tequila Fest ${event.city} 2026 — ${event.date}`,
    description: event.description,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  // Fetch og_image from DB (may be null if not uploaded yet)
  const db = supabaseAdmin as any;
  const { data } = await db
    .from("events")
    .select("og_image, status")
    .eq("slug", slug)
    .single();

  const ogImage: string | null = data?.og_image || null;
  const dbStatus: string | null = data?.status || null;

  return <EventPage event={event} ogImage={ogImage} dbStatus={dbStatus} />;
}
