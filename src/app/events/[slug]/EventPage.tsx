"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, Clock, Ticket, ArrowLeft, Star, Loader2 } from "lucide-react";
import { PRICING } from "@/lib/events";
import type { EventData } from "@/lib/events";
import type { TicketType } from "@/lib/stripe";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Confetti from "@/components/Confetti";

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

function CheckoutButton({
  eventSlug, ticketType, quantity = 1, children, className, style,
}: {
  eventSlug: string;
  ticketType: TicketType;
  quantity?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug, ticketType, quantity }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading} className={`${className} disabled:opacity-70 disabled:cursor-not-allowed`} style={style}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Redirecting...
        </span>
      ) : children}
    </button>
  );
}

export default function EventPage({ event }: { event: EventData }) {
  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

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
              <a href="#tickets"
                className="animate-pulse-glow cursor-pointer inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-10 py-5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95">
                <Ticket size={20} />
                GET TICKETS — From ${PRICING.earlyBird.price}
              </a>
              {/* Hero quick-buy — goes straight to Early Bird checkout */}
              {event.gaTicket && (
                <a href="#tickets"
                  className="cursor-pointer inline-flex items-center gap-2 border border-white/25 hover:border-white/50 text-white/70 hover:text-white text-base px-7 py-4 rounded-full transition-all duration-200">
                  $5 GA Entry
                  {event.gaTicket.limited && <span className="text-yellow-400 text-xs font-bold">· {event.gaTicket.qty} left</span>}
                </a>
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
              <p className="text-white/40 mt-3 text-sm">All Inclusive · Prices increase as event approaches</p>
            </motion.div>

            {/* Pricing tiers — All Inclusive */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {[
                { tier: PRICING.earlyBird, highlight: true, badge: "🔥 Best Price" },
                { tier: PRICING.regular,   highlight: false, badge: null },
                { tier: PRICING.late,      highlight: false, badge: "Final Week" },
              ].map(({ tier, highlight, badge }, i) => (
                <motion.div key={tier.label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative">
                  {badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap ${highlight ? "bg-yellow-500 text-black" : "bg-white/10 text-white/60 border border-white/20"}`}>
                        {badge}
                      </span>
                    </div>
                  )}
                  <div className={`rounded-2xl p-6 border h-full flex flex-col text-center transition-all duration-200 ${highlight ? "ring-1" : ""} ${!tier.available ? "opacity-50" : ""}`}
                    style={{
                      background: highlight ? `linear-gradient(135deg, ${event.color}20, ${event.color}08)` : "rgba(255,255,255,0.03)",
                      borderColor: highlight ? `${event.color}60` : "rgba(255,255,255,0.1)",
                      ...(highlight ? { boxShadow: `0 0 30px ${event.color}20` } : {}),
                    }}>
                    <p className="font-display text-white text-2xl mt-2">{tier.label.toUpperCase()}</p>
                    <p className="font-display mt-2 mb-1" style={{ fontSize: "3.5rem", color: highlight ? event.color : "white" }}>
                      ${tier.price}
                    </p>
                    <p className="text-white/40 text-xs mb-6">{tier.note}</p>
                    {tier.available ? (
                      <CheckoutButton
                        eventSlug={event.slug}
                        ticketType={tier.label === "Early Bird" ? "earlyBird" : tier.label === "Regular Rate" ? "regular" : "late"}
                        className="mt-auto w-full text-center font-bold text-base py-3 rounded-full transition-all duration-200 hover:scale-105"
                        style={highlight ? { background: event.color, color: "#0d0500" } : { background: "rgba(255,255,255,0.1)", color: "white" }}
                      >
                        Buy Now — ${tier.price}
                      </CheckoutButton>
                    ) : (
                      <div className="mt-auto block text-center text-white/30 text-sm py-3 rounded-full border border-white/10">
                        Available Final Week
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* What's included note */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-center mb-12 text-white/30 text-xs tracking-wide">
              All Inclusive tiers include: 12 tasting tickets · Live music · Authentic food · Souvenir item · Full festival access
              {event.freeParking && <span className="text-green-400/70"> · Free parking</span>}
            </motion.div>

            {/* VIP standalone + GA row */}
            <div className={`grid gap-6 ${event.gaTicket ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-xl mx-auto"}`}>

              {/* VIP — standalone ticket */}
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-[#888] to-white text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    ✦ Premium Experience
                  </span>
                </div>
                <div className="rounded-2xl p-6 border h-full flex flex-col"
                  style={{
                    background: "linear-gradient(135deg, rgba(192,192,192,0.1), rgba(60,60,60,0.6))",
                    borderColor: "rgba(192,192,192,0.3)",
                    boxShadow: "0 0 40px rgba(192,192,192,0.08)",
                  }}>
                  <div className="flex items-start justify-between mb-2 mt-2">
                    <div>
                      <h3 className="font-display text-shimmer-platinum leading-none" style={{ fontSize: "2.5rem" }}>VIP</h3>
                      <p className="text-white/50 text-sm mt-1">Everything in All Inclusive, plus:</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-shimmer-platinum" style={{ fontSize: "3rem" }}>${PRICING.vip.price}</p>
                      <p className="text-white/30 text-xs">per person</p>
                    </div>
                  </div>

                  {/* All Inclusive base */}
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Includes All Inclusive +</p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {VIP_PERKS.map(perk => (
                        <li key={perk} className="flex items-center gap-2 text-white/70 text-xs">
                          <Star size={10} fill="#C0C0C0" className="text-[#C0C0C0] flex-shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <CheckoutButton
                    eventSlug={event.slug}
                    ticketType="vip"
                    className="mt-auto w-full text-center font-bold text-lg py-4 rounded-full transition-all duration-200 hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #888, #d4d4d4, #fff, #c0c0c0)", color: "#0d0500" }}
                  >
                    Buy VIP — ${PRICING.vip.price}
                  </CheckoutButton>
                </div>
              </motion.div>

              {/* $5 GA */}
              {event.gaTicket && (
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                  <div className="rounded-2xl p-6 border h-full flex flex-col" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display text-white text-3xl">GA ENTRY</h3>
                        <p className="text-white/50 text-sm mt-1">Door access only</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-white text-5xl">$5</p>
                        <p className="text-white/30 text-xs">per person</p>
                      </div>
                    </div>
                    {event.gaTicket.limited && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 mb-4">
                        <p className="text-yellow-400 text-xs font-bold">⚡ Only {event.gaTicket.qty} tickets available</p>
                      </div>
                    )}
                    <ul className="space-y-2 mb-6 flex-1">
                      {["Festival entry", "Access to vendor market", "Cash bar available"].map(item => (
                        <li key={item} className="flex items-center gap-2 text-white/50 text-sm">
                          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" className="w-4 h-4 flex-shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                          {item}
                        </li>
                      ))}
                      <li className="text-white/30 text-xs pt-1">* Tasting tickets not included</li>
                    </ul>
                    <CheckoutButton
                      eventSlug={event.slug}
                      ticketType="ga"
                      className="w-full text-center font-bold text-base py-3 rounded-full border border-white/20 hover:border-white/40 text-white/70 hover:text-white transition-all duration-200"
                    >
                      Buy GA Entry — $5
                    </CheckoutButton>
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
            <CheckoutButton
              eventSlug={event.slug}
              ticketType="earlyBird"
              className="animate-pulse-glow inline-flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-12 py-5 rounded-full transition-all duration-200 hover:scale-105"
            >
              <Ticket size={20} />
              Early Bird — ${PRICING.earlyBird.price}
            </CheckoutButton>
            <p className="mt-4 text-white/20 text-sm">Must be 21+ · TequilaFestUSA.com</p>
          </motion.div>
        </section>

        <Footer />
      </main>
    </>
  );
}
