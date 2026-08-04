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
    <div className="flex gap-3 justify-center mt-4">
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
          <span className="text-xs text-white/80 uppercase tracking-widest mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}

function getIncluded(event: EventData) {
  return [
    { icon: "🥃", label: "12 Tasting Tickets", desc: "Sample from 50+ premium tequilas" },
    { icon: "🎵", label: "Live Entertainment", desc: "Bands & DJs all night" },
    { icon: "🌮", label: event.foodVendor?.name ?? "Authentic Food", desc: event.foodVendor?.ticketNote ?? "Tacos, street food & more" },
    { icon: "🎁", label: "Souvenir Item", desc: "Exclusive Tequila Fest keepsake" },
    { icon: "🛍️", label: "Vendor Market", desc: "Artisans & tequila accessories" },
    { icon: "🎉", label: "Full Festival Access", desc: "All areas, all night" },
  ];
}

const VIP_PERKS = [
  "Private VIP lounge",
  "8 super premium pours",
  "Build-your-own taco bar",
  "Priority entry — skip the line",
  "Dedicated VIP bartenders",
  "VIP-only souvenir",
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

  // GA availability comes from the live DB ticket type (see EventPage's
  // `gaLive`), not a static event flag — it may not be offered at every city.
  const gaLive = liveTypes.find(lt => lt.name === "GA");
  const gaRemaining = gaLive ? Math.max(gaLive.capacity - gaLive.sold_count, 0) : 0;

  const ticketTypeOptions = [
    { key: "earlyBird" as TicketType, label: "Early Bird", price: 55, note: "First 300 tickets" },
    { key: "regular" as TicketType, label: "Regular Rate", price: 60, note: "General on-sale" },
    { key: "late" as TicketType, label: "Late Registration", price: 65, note: "Final week only" },
    { key: "vip" as TicketType, label: "VIP Experience", price: 125, note: "All inclusive + exclusive perks" },
    ...(gaLive ? [{ key: "ga" as TicketType, label: "GA Entry", price: 5, note: gaRemaining <= 30 ? `Only ${gaRemaining} available` : "Entry only" }] : []),
  ].map(tt => {
    const live = liveTypes.find(lt => lt.name === tt.label || PRICING_MAP[lt.name] === tt.key);
    return {
      ...tt,
      platformFee: live?.platform_fee ?? (tt.key === "ga" ? 1.00 : tt.key === "vip" ? 5.00 : 3.00),
      soldOut: live ? live.sold_count >= live.capacity : false,
      available: live ? live.is_active !== false : true,
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
  platform_fee?: number;
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

export default function EventPage({ event, ogImage, dbStatus }: { event: EventData; ogImage?: string | null; dbStatus?: string | null }) {
  const liveTypes = useLiveTicketTypes(event.slug);
  const { openCart, modal } = useCartModal(event, liveTypes);
  const isComingSoon = dbStatus === "coming_soon";
  const isCompleted = dbStatus === "completed";

  // "Late Registration" unlocks during the final week before the event
  // (through the event date itself) — was previously hardcoded to always
  // show the "Available Final Week" placeholder with no date check at all,
  // so it never actually became purchasable even on the day of the event.
  const daysUntilEvent = (new Date(event.dateISO).getTime() - Date.now()) / 86400000;
  const isFinalWeek = daysUntilEvent <= 7;

  // Cleveland 2027 (July 24) lands on National Tequila Day itself — worth a
  // special animated callout in the hero. Sparkle positions are generated
  // client-side only (after mount) instead of at module/render scope, so
  // server-rendered HTML never disagrees with the client and React doesn't
  // throw a hydration mismatch over randomized values.
  const isNationalTequilaDay = event.city === "Cleveland" && event.date.includes("2027");
  const TEQUILA_DAY_COLORS = ["#F5A623", "#C8102E", "#06b6d4", "#fff8f0", "#7B2FBE"];
  const [tequilaDaySparkles, setTequilaDaySparkles] = useState<{ top: string; left: string; delay: number; color: string }[]>([]);
  const [tequilaDayBursts, setTequilaDayBursts] = useState<{ x: number; y: number; angle: number; distance: number; delay: number; color: string }[]>([]);
  useEffect(() => {
    if (!isNationalTequilaDay) return;
    setTequilaDaySparkles(Array.from({ length: 24 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 3,
      color: TEQUILA_DAY_COLORS[Math.floor(Math.random() * TEQUILA_DAY_COLORS.length)],
    })));
    // Firework bursts: each is a cluster of particles shooting outward from
    // a random point around the badge, like real fireworks exploding.
    setTequilaDayBursts(Array.from({ length: 40 }, (_, i) => {
      const clusterAngle = (i % 8) * (Math.PI * 2 / 8) + Math.random() * 0.4;
      return {
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        angle: clusterAngle,
        distance: 40 + Math.random() * 50,
        delay: Math.floor(i / 8) * 1.1 + Math.random() * 0.3,
        color: TEQUILA_DAY_COLORS[Math.floor(Math.random() * TEQUILA_DAY_COLORS.length)],
      };
    }));
  }, [isNationalTequilaDay]);

  // GA availability now comes from the live DB ticket type, not a static
  // per-city flag — previously `gaTicket` was hardcoded to null for
  // every city on the DB-driven event page, silently hiding GA everywhere
  // even when it was actively for sale (e.g. Cleveland, Columbus).
  const gaLive = liveTypes.find(t => t.name === "GA");
  const gaSoldOut = gaLive ? (gaLive.is_active === false || gaLive.sold_count >= gaLive.capacity) : false;
  const gaRemaining = gaLive ? Math.max(gaLive.capacity - gaLive.sold_count, 0) : 0;
  const gaTicket = gaLive && !gaSoldOut ? { price: gaLive.price, limited: gaRemaining <= 30, qty: gaRemaining } : null;

  const STATIC_BRANDS = ["Camerena","Avión","Gran Coramino","1800","Jose Cuervo","Gran Centenario","Dobel","Milagro","Del Maguey","Olmeca Altos","Codigo 1530","El Jimador","Hornitos","El Tesoro","Sauza","Ghost","G4","Los Linderos","Suavecito","Teremana","Viva Agave","Dolce Vida","Corazon","Authentico"];
  const [brandNames, setBrandNames] = useState<string[]>(STATIC_BRANDS);
  useEffect(() => {
    fetch(`/api/brands?city=${encodeURIComponent(event.city)}`)
      .then(r => r.json())
      .then(d => {
        const signedUp: string[] = Array.isArray(d.brands) ? d.brands : [];
        if (signedUp.length) {
          const merged = Array.from(new Set([...signedUp, ...STATIC_BRANDS]));
          setBrandNames(merged);
        }
      })
      .catch(() => {});
  }, []);

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem(`ref_${event.slug}`, ref);
    }
  }, [event.slug]);
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
          {/* City header image (if uploaded) */}
          {ogImage && (
            <div className="absolute inset-0 z-0">
              <Image src={ogImage} alt={event.city} fill priority sizes="100vw" className="object-cover object-center" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,5,0,0.45) 0%, rgba(13,5,0,0.35) 40%, rgba(13,5,0,0.75) 80%, #0d0500 100%)" }} />
            </div>
          )}
          {/* Fallback gradient when no image */}
          {!ogImage && (
            <div className="absolute inset-0 z-0"
              style={{ background: `radial-gradient(ellipse at 50% 40%, ${event.color}22 0%, ${event.color}08 40%, #0d0500 70%)` }}
            />
          )}
          {!ogImage && (
            <div className="absolute inset-0 z-0 opacity-20"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F5A623' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              }}
            />
          )}
          <Confetti />

          <div className="relative z-20 text-center px-4 max-w-4xl mx-auto w-full pt-8 pb-10">

            {/* Scroll nudge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex flex-col items-center gap-1 mb-5"
            >
              <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-base font-black tracking-[0.2em] uppercase drop-shadow-lg"
                style={{ color: event.color, textShadow: `0 0 20px ${event.color}80` }}
              >
                🎟 Scroll Down to Select Tickets
              </motion.p>
              <motion.div
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
                  <motion.path
                    d="M11 2 L11 18 M4 13 L11 20 L18 13"
                    stroke={event.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>
              </motion.div>
            </motion.div>

            {/* Back link */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <Link href="/#events" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-8 transition-colors duration-200">
                <ArrowLeft size={14} />
                All Events
              </Link>
            </motion.div>

            {/* City badge */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border mb-4"
                style={{ color: event.color, borderColor: `${event.color}50`, background: `${event.color}12` }}>
                <span>{event.emoji}</span>{event.tag}
              </span>
            </motion.div>

            {/* National Tequila Day callout — Cleveland 2027 only, lands on 7/24 */}
            {isNationalTequilaDay && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                className="relative mb-7 inline-block"
                style={{ padding: "28px 12px" }}
              >
                {/* Firework bursts — particles shooting outward from random points around the badge */}
                {tequilaDayBursts.map((b, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                    style={{ top: `${b.y}%`, left: `${b.x}%`, background: b.color, boxShadow: `0 0 6px ${b.color}` }}
                    animate={{
                      x: [0, Math.cos(b.angle) * b.distance],
                      y: [0, Math.sin(b.angle) * b.distance],
                      opacity: [0, 1, 1, 0],
                      scale: [0, 1.4, 1, 0],
                    }}
                    transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 3.5, delay: b.delay, ease: "easeOut" }}
                  />
                ))}

                {/* Floating ambient sparkles */}
                {tequilaDaySparkles.map((s, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                    style={{ top: s.top, left: s.left, background: s.color, boxShadow: `0 0 8px ${s.color}` }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1.8, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
                  />
                ))}

                <motion.div
                  animate={{
                    scale: [1, 1.035, 1],
                    boxShadow: [
                      "0 0 25px rgba(245,166,35,0.4), 0 0 10px rgba(200,16,46,0.2)",
                      "0 0 55px rgba(245,166,35,0.75), 0 0 35px rgba(200,16,46,0.5), 0 0 20px rgba(6,182,212,0.3)",
                      "0 0 25px rgba(245,166,35,0.4), 0 0 10px rgba(200,16,46,0.2)",
                    ],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="relative flex items-center gap-3 sm:gap-4 px-6 sm:px-9 py-3.5 sm:py-5 rounded-full border-2"
                  style={{ borderColor: "rgba(245,166,35,0.6)", background: "linear-gradient(90deg, rgba(200,16,46,0.22), rgba(245,166,35,0.22), rgba(6,182,212,0.15))" }}
                >
                  {/* Sparkles pulsing in sync with the glow, right on the pill's edge */}
                  <motion.span
                    className="absolute -top-3 -left-2 pointer-events-none select-none"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.15, 0.7], rotate: [0, 20, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    style={{ fontSize: "1.1rem" }}
                  >
                    ✨
                  </motion.span>
                  <motion.span
                    className="absolute -bottom-3 -right-2 pointer-events-none select-none"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.15, 0.7], rotate: [0, -20, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    style={{ fontSize: "1.1rem" }}
                  >
                    ✨
                  </motion.span>

                  <motion.span
                    animate={{ rotate: [0, -16, 16, -10, 10, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
                    style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}
                  >
                    🥃
                  </motion.span>
                  <span className="font-display tracking-[0.1em] text-shimmer text-center leading-tight"
                    style={{ fontSize: "clamp(1.1rem, 3.4vw, 2rem)" }}>
                    IT&apos;S NATIONAL TEQUILA DAY<br className="sm:hidden" /> — MONSTER PARTY
                  </span>
                  <motion.span
                    animate={{ rotate: [0, 16, -16, 10, -10, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
                    style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}
                  >
                    🍾
                  </motion.span>
                </motion.div>
              </motion.div>
            )}

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

            {/* Sampling Hours */}
            {event.samplingHours && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                className="text-white/80 text-sm mt-2">
                🥃 Sampling Hours: <span className="text-white/70 font-medium">{event.samplingHours}</span>
              </motion.p>
            )}

            {/* Countdown */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Countdown dateISO={event.dateISO} />
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
              className="mt-4 flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
              {gaTicket && (
                <button onClick={() => openCart("ga")}
                  className="cursor-pointer inline-flex items-center gap-2 border border-white/25 hover:border-white/50 text-white/70 hover:text-white text-base px-7 py-4 rounded-full transition-all duration-200">
                  $5 GA Entry
                  {gaTicket.limited && <span className="text-yellow-400 text-xs font-bold">· {gaTicket.qty} left</span>}
                </button>
              )}
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 papel-picado-border opacity-50" />
        </section>

        {/* Tickets section */}
        <section id="tickets" className="py-20 px-4 bg-[#0a0300]">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-2">Secure Your Spot</p>
              <h2 className="font-display text-white" style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
                CHOOSE YOUR <span className="text-shimmer">TICKET</span>
              </h2>
              <p className="text-white/80 mt-3 text-sm">Mix ticket types · Bring friends · Pay once</p>
            </motion.div>

            {/* All Inclusive tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {[
                { typeKey: "Early Bird",       key: "earlyBird" as const, price: PRICING.earlyBird.price, note: "First 300 tickets", highlight: true,  badge: "🔥 Best Price" },
                { typeKey: "Regular Rate",      key: "regular" as const,   price: PRICING.regular.price,   note: "General on-sale",   highlight: false, badge: null },
                { typeKey: "Late Registration", key: "late" as const,      price: PRICING.late.price,      note: "Final week only",   highlight: false, badge: "Final Week", unavailableNote: "Available Final Week" },
              ].map(({ typeKey, key, price, note, highlight, badge, unavailableNote }, i) => {
                const live = liveTypes.find(t => t.name === typeKey);
                const soldOut = live ? (live.is_active === false || live.sold_count >= live.capacity) : false;
                const almostFull = live ? live.sold_count >= live.capacity * 0.9 && !soldOut : false;
                const badgeLabel = soldOut ? "🚫 Sold Out" : almostFull ? "🔥 Almost Gone" : badge;
                return (
                  <motion.div key={typeKey} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative">
                    {badgeLabel && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${soldOut ? "bg-red-500 text-white" : almostFull ? "bg-orange-500 text-black" : highlight ? "bg-yellow-500 text-black" : "bg-white/10 text-white/60 border border-white/20"}`}>
                          {badgeLabel}
                        </span>
                      </div>
                    )}
                    <div className={`rounded-2xl p-6 border h-full flex flex-col text-center transition-all duration-200 ${highlight && !soldOut ? "ring-1" : ""} ${soldOut ? "opacity-60" : ""}`}
                      style={{
                        background: soldOut ? "rgba(200,16,46,0.08)" : highlight ? `linear-gradient(135deg, ${event.color}20, ${event.color}08)` : "rgba(255,255,255,0.03)",
                        borderColor: soldOut ? "rgba(200,16,46,0.4)" : highlight ? `${event.color}60` : "rgba(255,255,255,0.1)",
                        ...(highlight && !soldOut ? { boxShadow: `0 0 30px ${event.color}20` } : {}),
                      }}>
                      <p className="font-display text-white text-2xl mt-2">{typeKey.toUpperCase()}</p>
                      <p className="font-display mt-2 mb-1" style={{ fontSize: "3.5rem", color: soldOut ? "#ef4444" : highlight ? event.color : "white" }}>
                        ${price}
                      </p>
                      <p className="text-white/80 text-xs mb-6">
                        {soldOut ? "This tier is sold out" : live ? `${live.sold_count} of ${live.capacity} sold` : note}
                      </p>
                      {isCompleted ? (
                        <div className="mt-auto block text-center text-white/80 font-bold text-base py-3 rounded-full border border-white/10">EVENT COMPLETED</div>
                      ) : isComingSoon ? (
                        <div className="mt-auto block text-center text-yellow-400 font-bold text-base py-3 rounded-full border border-yellow-500/30 bg-yellow-500/10">COMING SOON</div>
                      ) : soldOut ? (
                        <div className="mt-auto block text-center text-red-400 font-bold text-base py-3 rounded-full border border-red-500/30 bg-red-500/10">SOLD OUT</div>
                      ) : unavailableNote && !isFinalWeek ? (
                        <div className="mt-auto block text-center text-white/80 text-sm py-3 rounded-full border border-white/10">{unavailableNote}</div>
                      ) : (
                        <button onClick={() => openCart(key)}
                          className="mt-auto w-full font-bold text-base py-3 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer"
                          style={highlight ? { background: event.color, color: "#0d0500" } : { background: "rgba(255,255,255,0.1)", color: "white" }}>
                          Get Tickets — ${price}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-center mb-12 text-white/80 text-xs tracking-wide">
              All Inclusive tiers include: 12 tasting tickets · Live music · Authentic food · Souvenir item · Full festival access
              {event.freeParking && <span className="text-green-400/70"> · Free parking</span>}
            </motion.div>

            {/* VIP + GA row */}
            <div className={`grid gap-6 ${gaTicket ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-xl mx-auto"}`}>

              {/* VIP */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-[#888] to-white text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">✦ Premium Experience</span>
                </div>
                <div className="rounded-2xl p-6 border h-full flex flex-col"
                  style={{ background: "linear-gradient(135deg, rgba(192,192,192,0.1), rgba(60,60,60,0.6))", borderColor: "rgba(192,192,192,0.3)", boxShadow: "0 0 40px rgba(192,192,192,0.08)" }}>
                  <div className="flex items-start justify-between mb-2 mt-2">
                    <div>
                      <h3 className="font-display text-shimmer-platinum leading-none" style={{ fontSize: "2.5rem" }}>VIP EXPERIENCE</h3>
                      <p className="text-white/80 text-sm mt-1">Everything in All Inclusive, plus:</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-shimmer-platinum" style={{ fontSize: "3rem" }}>${PRICING.vip.price}</p>
                      <p className="text-white/80 text-xs">per person</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">Includes All Inclusive +</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {VIP_PERKS.map(perk => (
                        <li key={perk} className="flex items-center gap-2 text-white/70 text-xs">
                          <Star size={10} fill="#C0C0C0" className="text-[#C0C0C0] flex-shrink-0" />{perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {(() => {
                    const liveVip = liveTypes.find(t => t.name === "VIP Experience");
                    const vipSoldOut = liveVip ? (liveVip.is_active === false || liveVip.sold_count >= liveVip.capacity) : false;
                    return isCompleted ? (
                      <div className="mt-auto block text-center text-white/80 font-bold text-base py-4 rounded-full border border-white/10">EVENT COMPLETED</div>
                    ) : isComingSoon ? (
                      <div className="mt-auto block text-center text-yellow-400 font-bold text-base py-4 rounded-full border border-yellow-500/30 bg-yellow-500/10">COMING SOON</div>
                    ) : vipSoldOut ? (
                      <div className="mt-auto block text-center text-red-400 font-bold text-base py-4 rounded-full border border-red-500/30 bg-red-500/10">SOLD OUT</div>
                    ) : (
                      <button onClick={() => openCart("vip")}
                        className="mt-auto w-full font-bold text-lg py-4 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer"
                        style={{ background: "linear-gradient(135deg, #888, #d4d4d4, #fff, #c0c0c0)", color: "#0d0500" }}>
                        Get VIP — ${PRICING.vip.price}
                      </button>
                    );
                  })()}
                </div>
              </motion.div>

              {/* GA */}
              {gaTicket && (
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                  <div className="rounded-2xl p-6 border h-full flex flex-col" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display text-white text-3xl">GA ENTRY</h3>
                        <p className="text-white/80 text-sm mt-1">Door access only</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-white text-5xl">$5</p>
                        <p className="text-white/80 text-xs">per person</p>
                        <p className="text-white text-sm font-semibold mt-1">$10 at the door</p>
                      </div>
                    </div>
                    {gaTicket.limited && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 mb-4">
                        <p className="text-yellow-400 text-xs font-bold">⚡ Only {gaTicket.qty} tickets available</p>
                      </div>
                    )}
                    <ul className="space-y-2 mb-6 flex-1">
                      {["Festival entry", "Access to vendor market", "Cash bar available"].map(item => (
                        <li key={item} className="flex items-center gap-2 text-white/80 text-sm">
                          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" className="w-4 h-4 flex-shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>{item}
                        </li>
                      ))}
                      <li className="text-white/80 text-xs pt-1">* Tasting tickets not included</li>
                    </ul>
                    {isCompleted ? (
                      <div className="block text-center text-white/80 font-bold text-base py-3 rounded-full border border-white/10">EVENT COMPLETED</div>
                    ) : isComingSoon ? (
                      <div className="block text-center text-yellow-400 font-bold text-base py-3 rounded-full border border-yellow-500/30 bg-yellow-500/10">COMING SOON</div>
                    ) : (
                      <button onClick={() => openCart("ga")}
                        className="w-full font-bold text-base py-3 rounded-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white transition-all duration-200 cursor-pointer">
                        Get GA Entry — $5
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
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
                  <div key={i} className="flex items-center gap-3 text-white/80 text-sm">
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
                {getIncluded(event).map((item) => (
                  <div key={item.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="font-semibold text-white text-sm mt-2">{item.label}</p>
                    <p className="text-white/80 text-xs mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tequila brand scroller */}
        <section className="py-16 bg-[#0d0500] overflow-hidden">
          {/* Header — contained */}
          <div className="px-4 text-center mb-10">
            <p className="text-yellow-500 text-xs font-bold tracking-[0.3em] uppercase mb-3">Sample The Best</p>
            <h2 className="font-display text-white" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
              50+ <span className="text-shimmer">TEQUILAS</span>
            </h2>
            <p className="text-white/80 mt-4 max-w-xl mx-auto">
              From smooth blancos to complex añejos — explore the full spectrum of agave spirits from the world&apos;s finest distillers.
            </p>
            <div className="w-24 h-1 bg-yellow-500 mx-auto mt-4 rounded-full" />
          </div>

          {/* Scroller — same width as VIP scroller */}
          <div className="px-4 mb-10">
            <div className="max-w-6xl mx-auto relative overflow-hidden rounded-2xl py-4">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#0d0500] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#0d0500] to-transparent z-10 pointer-events-none" />
              <div className="flex gap-4 w-max animate-marquee" style={{ animationDuration: "70s" }}>
                {[...Array(3)].flatMap(() => brandNames).map((brand, i) => (
                  <div key={i} className="flex-shrink-0 bg-white/5 border border-white/10 hover:border-yellow-500/40 hover:bg-white/10 rounded-2xl px-8 py-5 transition-all duration-200">
                    <p className="font-display text-yellow-400 text-2xl whitespace-nowrap">{brand}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agave type cards */}
          <div className="px-4">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { type: "Blanco",      desc: "Crisp & pure",       color: "#fff8f0" },
                { type: "Reposado",    desc: "Aged 2–12 months",   color: "#F5A623" },
                { type: "Añejo",       desc: "Aged 1–3 years",     color: "#C8102E" },
                { type: "Extra Añejo", desc: "Aged 3+ years",      color: "#7B2FBE" },
              ].map(t => (
                <div key={t.type} className="text-center p-5 rounded-xl border border-white/10 bg-white/5">
                  <div className="w-3 h-3 rounded-full mx-auto mb-3" style={{ backgroundColor: t.color }} />
                  <p className="font-display text-xl text-white">{t.type.toUpperCase()}</p>
                  <p className="text-white/80 text-sm mt-1">{t.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <a href="https://www.tequilafestusa.com/brand-packages"
                className="inline-block border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500 hover:text-black text-xs font-bold tracking-[0.2em] uppercase px-6 py-3 rounded-full transition-all duration-200">
                Add Your Tequila Brand
              </a>
            </div>
          </div>
        </section>

        {/* VIP tequila scroller */}
        <section className="py-14 px-4 bg-[#0a0300] overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-[#888] text-xs font-bold tracking-[0.4em] uppercase mb-6">VIP Exclusive Pours</p>
            <div className="relative overflow-hidden rounded-2xl py-6"
              style={{ background: "linear-gradient(145deg,rgba(25,25,25,0.95),rgba(12,12,12,0.98))", border: "1px solid rgba(192,192,192,0.15)" }}>
              <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right,rgba(12,12,12,1),transparent)" }} />
              <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to left,rgba(12,12,12,1),transparent)" }} />
              <div className="flex gap-6 w-max animate-marquee">
                {[...["Clase Azul·Reposado","Don Julio·1942","Avión·Extra Añejo 44","Jose Cuervo·La Familia","Suavecito·Extra Añejo","Código 1530·Añejo","Gran Coramino·Añejo","Clase Azul·Reposado","Don Julio·1942","Avión·Extra Añejo 44","Jose Cuervo·La Familia","Suavecito·Extra Añejo","Código 1530·Añejo","Gran Coramino·Añejo"]].map((item, i) => {
                  const [name, sub] = item.split("·");
                  return (
                    <div key={i} className="flex-shrink-0 flex items-center gap-4 px-6">
                      <div className="w-1.5 h-1.5 rotate-45 flex-shrink-0" style={{ background: "linear-gradient(135deg,#C0C0C0,#E8E8E8)" }} />
                      <div className="text-center">
                        <p className="font-display text-2xl text-shimmer-platinum whitespace-nowrap">{name}</p>
                        <p className="text-[#666] text-xs tracking-widest uppercase mt-0.5">{sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-4 bg-[#0a0300] text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-white/80 text-sm mb-2">Don&apos;t wait — tickets sell out every year</p>
            <h2 className="font-display text-shimmer mb-8" style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}>
              GET YOUR TICKETS NOW
            </h2>
            <button onClick={() => openCart()}
              className="animate-pulse-glow inline-flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-12 py-5 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer">
              <Ticket size={20} />
              Select Tickets
            </button>
            <p className="mt-4 text-white/80 text-sm">Must be 21+ · Mix ticket types · Bring friends</p>
          </motion.div>
        </section>

        <Footer />
      </main>
    </>
  );
}
