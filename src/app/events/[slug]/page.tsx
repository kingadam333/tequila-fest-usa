import { notFound } from "next/navigation";
import { getEvent, EVENTS } from "@/lib/events";
import EventPage from "./EventPage";

export async function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

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
  return <EventPage event={event} />;
}
