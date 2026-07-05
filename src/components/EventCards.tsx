"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Ticket } from "lucide-react";

// Style map keyed by city slug — visual theming only, not data
const CITY_STYLE: Record<string, { gradient: string; border: string; badgeBg: string; badgeText: string }> = {
  cincinnati: { gradient: "from-yellow-900/40 to-orange-950/40", border: "border-yellow-500/30", badgeBg: "bg-yellow-500/15", badgeText: "text-yellow-400" },
  cleveland:  { gradient: "from-red-900/40 to-rose-950/40",    border: "border-red-500/30",    badgeBg: "bg-red-500/15",    badgeText: "text-red-400"    },
  columbus:   { gradient: "from-emerald-900/40 to-teal-950/40", border: "border-emerald-500/30", badgeBg: "bg-emerald-500/15", badgeText: "text-emerald-400" },
  phoenix:    { gradient: "from-purple-900/40 to-violet-950/40", border: "border-purple-500/30",  badgeBg: "bg-purple-500/15",  badgeText: "text-purple-400"  },
};
const DEFAULT_STYLE = { gradient: "from-white/5 to-white/0", border: "border-white/10", badgeBg: "bg-white/10", badgeText: "text-white/60" };

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" as const },
  }),
};

interface DBEvent {
  id: string;
  slug: string;
  city: string;
  state: string;
  date: string;
  date_iso: string;
  time: string;
  venue: string;
  venue_detail: string;
  color: string;
  emoji: string;
  tag: string;
  free_parking: boolean;
  status: string;
  gaPrice: number | null;
}

export default function EventCards() {
  const [events, setEvents] = useState<DBEvent[]>([]);

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(d => {
        // Show only non-completed events for current + future years, sorted by date
        const visible = (d.events || [])
          .filter((e: DBEvent) => e.status !== "completed" && e.status !== "draft")
          .sort((a: DBEvent, b: DBEvent) => {
            const da = a.date_iso ? new Date(a.date_iso).getTime() : 0;
            const db2 = b.date_iso ? new Date(b.date_iso).getTime() : 0;
            return da - db2;
          });
        setEvents(visible);
      })
      .catch(() => {});
  }, []);

  if (!events.length) return null;

  return (
    <section id="events" className="py-24 px-4 bg-[#0d0500] relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Tour Dates</p>
          <h2 className="font-display text-shimmer" style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
            FIND YOUR CITY
          </h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto text-lg">
            Four festivals. One unforgettable tour. Grab your tickets before they sell out.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event, i) => {
            const style = CITY_STYLE[event.slug] || CITY_STYLE[event.slug.split("-")[0]] || DEFAULT_STYLE;
            const isComingSoon = event.status === "coming_soon";
            const isOnSale = event.status === "on_sale";

            return (
              <motion.div
                key={event.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariants}
                className="h-full"
              >
                <a
                  href={isOnSale ? `/events/${event.slug}#tickets` : undefined}
                  className={`group flex flex-col h-full bg-gradient-to-br ${style.gradient} border ${style.border} rounded-2xl p-6 transition-all duration-300 ${isOnSale ? "hover:scale-[1.02] hover:shadow-2xl cursor-pointer" : "opacity-80 cursor-default"}`}
                  style={{ boxShadow: `0 4px 40px ${event.color}10` }}
                  onClick={!isOnSale ? e => e.preventDefault() : undefined}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className={`inline-flex items-center gap-1.5 ${style.badgeBg} ${style.badgeText} text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3`}>
                        <span>{event.emoji}</span>
                        <span>{event.tag}</span>
                      </div>
                      <h3 className="font-display leading-none" style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", color: event.color }}>
                        {event.city.toUpperCase()}
                      </h3>
                      <p className="text-white/40 text-sm font-bold tracking-widest uppercase">{event.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/30 text-xs uppercase tracking-widest mb-1">All Inclusive</p>
                      <p className="font-display text-white" style={{ fontSize: "2.5rem" }}>$55</p>
                      <p className="text-yellow-500/70 text-xs font-semibold">Early Bird</p>
                      <p className="text-white/20 text-xs">then $60 / $65</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Calendar size={14} style={{ color: event.color }} />
                      <span>{event.date || "Date TBD"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Clock size={14} style={{ color: event.color }} />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <MapPin size={14} style={{ color: event.color }} />
                      <span>{event.venue}{event.venue_detail ? ` · ${event.venue_detail}` : ""}</span>
                    </div>
                  </div>

                  {/* What's included — compact so everything fits on one line */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {["12 Tastings", "Live Music", "Food", "Souvenir"].map(item => (
                      <span key={item} className="whitespace-nowrap text-[11px] text-white/50 bg-white/5 border border-white/10 rounded-full px-2 py-1">{item}</span>
                    ))}
                    {event.gaPrice !== null && (
                      <span className="whitespace-nowrap text-[11px] font-semibold rounded-full px-2 py-1 bg-yellow-900/30 border border-yellow-500/30 text-yellow-400">🎟️ GA ${event.gaPrice}</span>
                    )}
                    {event.free_parking && (
                      <span className="whitespace-nowrap text-[11px] font-semibold rounded-full px-2 py-1 bg-green-900/30 border border-green-500/30 text-green-400">🅿️ Free Parking</span>
                    )}
                  </div>

                  {/* CTA */}
                  {isComingSoon ? (
                    <div className="mt-auto flex items-center justify-center gap-2 w-full font-bold px-6 py-3 rounded-full border-2"
                      style={{ borderColor: event.color, color: event.color, background: `${event.color}12` }}>
                      <span>🔔</span><span>COMING SOON</span>
                    </div>
                  ) : isOnSale ? (
                    <div className="mt-auto flex items-center justify-between w-full font-bold text-black px-6 py-3 rounded-full transition-all duration-200 group-hover:brightness-110"
                      style={{ background: event.color }}>
                      <div className="flex items-center gap-2"><Ticket size={16} /><span>GET TICKETS</span></div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  ) : (
                    <div className="mt-auto flex items-center justify-center gap-2 w-full font-bold px-6 py-3 rounded-full border-2 border-white/10 text-white/30">
                      <span>Tickets Unavailable</span>
                    </div>
                  )}
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 papel-picado-border opacity-30" />
    </section>
  );
}
