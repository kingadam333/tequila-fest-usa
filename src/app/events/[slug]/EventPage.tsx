"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, Clock, Ticket, ArrowLeft, Star } from "lucide-react";
import { PRICING } from "@/lib/events";
import type { EventData } from "@/lib/events";
import type { TicketType } from "@/lib/ticket-config";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Confetti from "@/components/Confetti";
import TicketCartModal from "@/components/TicketCartModal";
import { TICKET_LABELS } from "@/lib/ticket-config";

function Countdown({ dateISO }: { dateISO: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(dateISO).getTime() - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateISO]);

  return (
    <div className="flex gap-3 justify-center mt-8">
      {[
        { label: "Days", value: timeLeft.days },
        { label: "Hours", value: timeLeft.hours },
        { label: "Mins", value: timeLeft.minutes },
        { label: "Secs", value: timeLeft.seconds },
      ].map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 min-w-[70px]">
          <span className="font-display text-3xl md:text-4xl text-yellow-400">
            {String(value).padStart(2, "0")}
          </span>
          <span className="text-xs text-white/50 uppercase tracking-widest mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}

const INCLUDED = [
  { icon: "🥃", label: "12 Tasting Tickets", desc: "Sample from 50+ premium tequilas" },
  { icon: "🎵", label: "Live Entertainment", desc: "Bands & DJs all night" },
  { icon: "🌮", label: "Authentic Food", desc: "Tacos, street food & more" },
  { icon: "🎁", label: "Souvenir Item", desc: "Exclusive Tequila Fest keepsake" },
  { icon: "🛍️", label: "Vendor Market", desc: "Artisans & tequila accessories" },
  { icon: "🎉", label: "Full Festival Access", desc: "All areas, all night" },
];

const VIP_PERKS = [
  "Private VIP lounge",
  "8 super premium pours",
  "Build-your-own taco bar",
  "Priority entry — skip the line",
  "Dedicated VIP bartenders",
  "VIP-only gift bag",
];

function useCartModal(event: EventData, liveTypes: LiveTicketType[]) {
  const [showCart, setShowCart] = useState(false);
  const [initialType, setInitialType] = useState<TicketType | undefined>();

  const PRICING_MAP: Record<string, TicketType> = {
    "Early Bird": "earlyBird",
    "Regular Rate": "regular",
    "Late Registration": "late",
    "VIP Experience": "vip",
    "GA": "ga",
  };

  const ticketTypeOptions = [
    { key: "earlyBird" as TicketType, label: "Early Bird", price: 55, note: "First 300 tickets" },
    { key: "regular" as TicketType, label: "Regular Rate", price: 60, note: "General on-sale" },
    { key: "late" as TicketType, label: "Late Registration", price: 65, note: "Final week only" },
    { key: "vip" as TicketType, label: "VIP Experience", price: 125, note: "All inclusive + exclusive perks" },
    ...(event.gaTicket ? [{ key: "ga" as TicketType, label: "GA Entry", price: 5, note: event.gaTicket.limited ? `Only ${event.gaTicket.qty} available` : "Entry only" }] : []),
  ].map(tt => {
    const live = liveTypes.find(lt => lt.name === tt.label || PRICING_MAP[lt.name] === tt.key);
    return {
      ...tt,
      soldOut: live ? live.sold_count >= live.capacity : false,
      available: true,
    };
  });

  const openCart = (type?: TicketType) => { setInitialType(type); setShowCart(true); };

  const modal = showCart ? (
    <TicketCartModal
      eventSlug={event.slug}
      eventCity={event.city}
      eventColor={event.color}
      ticketTypes={ticketTypeOptions}
      initialType={initialType}
      onClose={() => setShowCart(false)}
    />
  ) : null;

  return { openCart, modal };
}

interface LiveTicketType {
  name: string;
  price: number;
  capacity: number;
  sold_count: number;
  is_active: boolean;
}

function useLiveTicketTypes(eventSlug: string) {
  const [types, setTypes] = useState<LiveTicketType[]>([]);
  useEffect(() => {
    fetch(`/api/events/${eventSlug}/ticket-types`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.ticketTypes && setTypes(d.ticketTypes))
      .catch(() => {});
  }, [eventSlug]);
  return types;
}

export default function EventPage({ event }: { event: EventData }) {
  const liveTypes = useLiveTicketTypes(event.slug);
  const { openCart, modal } = useCartModal(event, liveTypes);
  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      {modal}
      <main className="bg-[#0d0500] min-h-screen">

        {/* Hero */}
        <section className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0"
            style={{ background: `radial-gradient(ellipse at 50% 40%, ${event.color}22 0%, ${event.color}08 40%, #0d0500 70%)` }}
          />
          <div className="absolute inset-0 z-0 opacity-20"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F5A623' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
          <Confetti />

          <div className="relative z-20 text-center px-4 max-w-4xl mx-auto w-full pt-8 pb-24">
            {/* Back link */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <Link href="/#events" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors duration-200">
                <ArrowLeft size={14} />
                All Events
              </Link>
            </motion.div>

            {/* Logo */}
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
              <Image src="/tequilafest_usa.png" alt="Tequila Fest USA" width={200} height={200} priority className="mx-auto w-28 md:w-40 drop-shadow-2xl mb-6" />
            </motion.div>

            {/* City badge */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border mb-4"
                style={{ color: event.color, borderColor: `${event.color}50`, background: `${event.color}12` }}>
                <span>{event.emoji}</span>{event.tag}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="font-display leading-none" style={{ fontSize: "clamp(3.5rem, 12vw, 9rem)" }}>
              <span className="text-shimmer">TEQUILA</span>
              {" "}
              <span className="text-shimmer-blue">FEST</span>
            </motion.h1>
            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="font-display tracking-[0.3em] mt-1" style={{ fontSize: "clamp(1.5rem, 5vw, 4rem)", color: event.color }}>
              {event.city.toUpperCase()}
            </motion.h2>

            {/* Date/venue pill */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4 mt-6 text-white/60 text-sm">
              <span className="flex items-center gap-1.5"><Calendar size={14} style={{ color: event.color }} />{event.date}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} style={{ color: event.color }} />{event.time}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} style={{ color: event.color }} />{event.venue}, {event.venueDetail}</span>
            </motion.div>

            {/* Countdown */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Countdown dateISO={event.dateISO} />
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
              <button onClick={() => openCart()}
                className="animate-pulse-glow cursor-pointer inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-10 py-5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95">
                <Ticket size={20} />
                GET TICKETS — From ${PRICING.earlyBird.price}
              </button>
              {event.gaTicket && (
                <button onClick={() => openCart("ga")}
                  className="cursor-pointer inline-flex items-center gap-2 border border-white/25 hover:border-white/50 text-white/70 hover:text-white text-base px-7 py-4 rounded-full transition-all duration-200">
                  $5 GA Entry
                  {event.gaTicket.limited && <span className="text-yellow-400 text-xs font-bold">· {event.gaTicket.qty} left</span>}
                </button>
              )}
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 papel-picado-border opacity-50" />
        </section>

        {/* Tickets section */}
        <section id="tickets" className="py-20 px-4 bg-[#0a0300]">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
              <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-2">Secure Your Spot</p>
              <h2 className="font-display text-white mb-4" style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
                GET YOUR <span className="text-shimmer">TICKETS</span>
              </h2>
              <p className="text-white/40 text-sm mb-8">Choose any combination — mix ticket types, bring friends, get exactly what you need.</p>

              {/* Ticket type preview cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8 text-left">
                {[
                  { label: "Early Bird", price: PRICING.earlyBird.price, note: "First 300 tickets", highlight: true },
                  { label: "Regular Rate", price: PRICING.regular.price, note: "General on-sale" },
                  { label: "Late Registration", price: PRICING.late.price, note: "Final week" },
                  { label: "VIP Experience", price: PRICING.vip.price, note: "All inclusive + perks", platinum: true },
                  ...(event.gaTicket ? [{ label: "GA Entry", price: 5, note: "Entry only" }] : []),
                ].map((tt) => {
                  const live = liveTypes.find(lt => lt.name === tt.label);
                  const soldOut = live ? live.sold_count >= live.capacity : false;
                  return (
                    <div key={tt.label} onClick={() => !soldOut && openCart()}
                      className={`rounded-xl border p-3 cursor-pointer transition-all hover:scale-[1.02] ${soldOut ? "opacity-40 cursor-not-allowed" : "hover:border-white/30"} ${(tt as any).highlight ? "border-yellow-500/30 bg-yellow-500/5" : (tt as any).platinum ? "border-[#C0C0C0]/20 bg-[#C0C0C0]/5" : "border-white/10 bg-white/[0.02]"}`}>
                      <p className="text-white/60 text-xs mb-1">{tt.label}</p>
                      <p className="font-display text-xl" style={{ color: (tt as any).highlight ? "#F5A623" : (tt as any).platinum ? "#C0C0C0" : "white" }}>${tt.price}</p>
                      <p className="text-white/30 text-xs">{soldOut ? "Sold Out" : tt.note}</p>
                    </div>
                  );
                })}
              </div>

              <button onClick={() => openCart()}
                className="animate-pulse-glow inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-12 py-5 rounded-full transition-all duration-200 hover:scale-105">
                <Ticket size={20} />
                Select Tickets
              </button>
              <p className="text-white/20 text-xs mt-4">Mix ticket types · Add multiple quantities · Pay once</p>
            </motion.div>
          </div>

          {/* keep the old max-w-5xl structure for event details below */}
          <div className="max-w-5xl mx-auto">

          </div>
        </section>

        {/* Event details */}
        <section className="py-20 px-4 bg-[#0d0500]">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

            {/* About */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-yellow-500 text-xs font-bold tracking-[0.3em] uppercase mb-3">About This Event</p>
              <h2 className="font-display text-white mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
                TEQUILA FEST<br />
                <span style={{ color: event.color }}>{event.city.toUpperCase()}</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-6">{event.description}</p>
              <div className="space-y-3">
                {[
                  { icon: <Calendar size={16} />, label: event.date },
                  { icon: <Clock size={16} />, label: event.time },
                  { icon: <MapPin size={16} />, label: event.venue },
                  { icon: <MapPin size={14} />, label: event.venueAddress },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/50 text-sm">
                    <span style={{ color: event.color }}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
                {event.freeParking && (
                  <div className="flex items-center gap-3 text-green-400 text-sm font-semibold">
                    <span>🅿️</span> Free Parking Available
                  </div>
                )}
              </div>
            </motion.div>

            {/* What's included grid */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-yellow-500 text-xs font-bold tracking-[0.3em] uppercase mb-3">All Inclusive Ticket</p>
              <h2 className="font-display text-white mb-6" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>WHAT&apos;S INCLUDED</h2>
              <div className="grid grid-cols-2 gap-3">
                {INCLUDED.map((item) => (
                  <div key={item.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="font-semibold text-white text-sm mt-2">{item.label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-4 bg-[#0a0300] text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-white/40 text-sm mb-2">Don&apos;t wait — tickets sell out every year</p>
            <h2 className="font-display text-shimmer mb-8" style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
              GET YOUR TICKETS NOW
            </h2>
            <button onClick={() => openCart()}
              className="animate-pulse-glow inline-flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-12 py-5 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer">
              <Ticket size={20} />
              Select Tickets
            </button>
            <p className="mt-4 text-white/20 text-sm">Must be 21+ · Mix ticket types · Bring friends</p>
          </motion.div>
        </section>

        <Footer />
      </main>
    </>
  );
}
