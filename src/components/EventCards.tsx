"use client";

import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Ticket } from "lucide-react";

const EVENTS = [
  {
    city: "Cincinnati",
    state: "OH",
    date: "June 13, 2026",
    time: "3–9 PM",
    venue: "Fountain Square",
    venueDetail: "Downtown Cincinnati",
    price: 55,
    gaTicket: null,
    freeParking: false,
    slug: "cincinnati",
    color: "#F5A623",
    gradient: "from-yellow-900/40 to-orange-950/40",
    border: "border-yellow-500/30",
    badgeBg: "bg-yellow-500/15",
    badgeText: "text-yellow-400",
    emoji: "🏙️",
    tag: "Flagship City",
  },
  {
    city: "Cleveland",
    state: "OH",
    date: "July 25, 2026",
    time: "3–9 PM",
    venue: "Cuyahoga County Fairgrounds",
    venueDetail: "Berea, OH",
    price: 55,
    gaTicket: { price: 5, limited: false },
    freeParking: true,
    slug: "cleveland",
    color: "#C8102E",
    gradient: "from-red-900/40 to-rose-950/40",
    border: "border-red-500/30",
    badgeBg: "bg-red-500/15",
    badgeText: "text-red-400",
    emoji: "🌊",
    tag: "Lake Erie Edition",
  },
  {
    city: "Columbus",
    state: "OH",
    date: "August 8, 2026",
    time: "3–9 PM",
    venue: "Gravity / Greater Columbus",
    venueDetail: "Convention Center",
    price: 55,
    gaTicket: { price: 5, limited: true },
    freeParking: false,
    slug: "columbus",
    color: "#00A878",
    gradient: "from-emerald-900/40 to-teal-950/40",
    border: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
    emoji: "🌿",
    tag: "Capital City",
  },
  {
    city: "Phoenix",
    state: "AZ",
    date: "November 14, 2026",
    time: "3–9 PM",
    venue: "Phoenix Convention Center",
    venueDetail: "Downtown Phoenix",
    price: 55,
    gaTicket: null,
    freeParking: true,
    slug: "phoenix",
    color: "#7B2FBE",
    gradient: "from-purple-900/40 to-violet-950/40",
    border: "border-purple-500/30",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-400",
    emoji: "🌵",
    tag: "Desert Edition",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" as const },
  }),
};

export default function EventCards() {
  return (
    <section id="events" className="py-24 px-4 bg-[#0d0500] relative">
      {/* Section header */}
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">2026 Tour Dates</p>
          <h2
            className="font-display text-shimmer"
            style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
          >
            FIND YOUR CITY
          </h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-lg">
            Four festivals. One unforgettable tour. Grab your tickets before they sell out.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EVENTS.map((event, i) => (
            <motion.div
              key={event.city}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={cardVariants}
              className="h-full"
            >
              <a
                href={`/events/${event.slug}#tickets`}
                className={`group flex flex-col h-full bg-gradient-to-br ${event.gradient} border ${event.border} rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 hover:shadow-2xl cursor-pointer`}
                style={{ boxShadow: `0 4px 40px ${event.color}10` }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className={`inline-flex items-center gap-1.5 ${event.badgeBg} ${event.badgeText} text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3`}>
                      <span>{event.emoji}</span>
                      <span>{event.tag}</span>
                    </div>
                    <h3
                      className="font-display leading-none"
                      style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", color: event.color }}
                    >
                      {event.city.toUpperCase()}
                    </h3>
                    <p className="text-white/40 text-sm font-bold tracking-widest uppercase">{event.state}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/30 text-xs uppercase tracking-widest mb-1">All Inclusive</p>
                    <p className="font-display text-white" style={{ fontSize: "2.5rem" }}>
                      ${event.price}
                    </p>
                    <p className="text-yellow-500/70 text-xs font-semibold">Early Bird</p>
                    <p className="text-white/20 text-xs">then $60 / $65</p>
                    {event.gaTicket && (
                      <p className="text-white/40 text-xs mt-1.5 border-t border-white/10 pt-1.5">
                        + $5 GA ticket available
                        {event.gaTicket.limited && (
                          <span className="ml-1 text-yellow-500/70">(100 only)</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Calendar size={14} style={{ color: event.color }} />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Clock size={14} style={{ color: event.color }} />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <MapPin size={14} style={{ color: event.color }} />
                    <span>{event.venue} · {event.venueDetail}</span>
                  </div>
                </div>

                {/* What's included */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {["12 Tasting Tickets", "Live Music", "Authentic Food", "Souvenir Item"].map((item) => (
                    <span
                      key={item}
                      className="text-xs text-white/50 bg-white/5 border border-white/10 rounded-full px-3 py-1"
                    >
                      {item}
                    </span>
                  ))}
                  <span className={`text-xs font-semibold rounded-full px-3 py-1 ${event.freeParking ? "bg-green-900/30 border border-green-500/30 text-green-400" : "border border-transparent text-transparent select-none"}`}>
                    🅿️ Free Parking
                  </span>
                </div>

                {/* $5 GA callout — always rendered, invisible when not applicable */}
                <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 mb-4 ${event.gaTicket ? "bg-white/5 border border-white/10" : "border border-transparent"}`}
                  style={{ visibility: event.gaTicket ? "visible" : "hidden" }}
                >
                  <span className="text-lg">🎟️</span>
                  <div>
                    <p className="text-white/80 text-xs font-semibold">
                      $5 GA Ticket Available
                      {event.gaTicket?.limited && (
                        <span className="ml-2 text-yellow-400 font-bold">· Only 100 Available</span>
                      )}
                    </p>
                    <p className="text-white/35 text-xs">Entry only — tasting tickets not included</p>
                  </div>
                </div>

                {/* CTA — mt-auto pushes to bottom so all cards are uniform */}
                <div
                  className="mt-auto flex items-center justify-between w-full font-bold text-black px-6 py-3 rounded-full transition-all duration-200 group-hover:brightness-110"
                  style={{ background: event.color }}
                >
                  <div className="flex items-center gap-2">
                    <Ticket size={16} />
                    <span>GET TICKETS</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 papel-picado-border opacity-30" />
    </section>
  );
}
