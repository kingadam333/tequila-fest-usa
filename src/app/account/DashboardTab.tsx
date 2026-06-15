"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Ticket, Star, Camera, Share2, ArrowRight, MapPin, Calendar } from "lucide-react";

const EVENTS = [
  { slug: "cincinnati", city: "Cincinnati", date: "June 13, 2026", color: "#F5A623", emoji: "🏙️" },
  { slug: "cleveland", city: "Cleveland", date: "July 25, 2026", color: "#C8102E", emoji: "🌊" },
  { slug: "columbus", city: "Columbus", date: "August 8, 2026", color: "#00A878", emoji: "🌿" },
  { slug: "phoenix", city: "Phoenix", date: "November 14, 2026", color: "#7B2FBE", emoji: "🌵" },
];

interface Props {
  firstName: string;
  loyaltyPoints: number;
  ticketCount: number;
  onGoToTickets: () => void;
}

export default function DashboardTab({ firstName, loyaltyPoints, ticketCount, onGoToTickets }: Props) {
  return (
    <div className="space-y-8">

      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-yellow-900/30 to-orange-950/20 border border-yellow-500/20 rounded-2xl p-6">
        <p className="font-display text-yellow-400 text-3xl leading-none mb-1">
          WELCOME BACK{firstName ? `, ${firstName.toUpperCase()}` : ""}!
        </p>
        <p className="text-white/50 text-sm">Your Tequila Fest USA account is all set.</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          onClick={onGoToTickets}
          className="bg-white/[0.03] border border-white/10 hover:border-yellow-500/30 rounded-2xl p-5 text-left transition-all duration-200 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center mb-3">
            <Ticket size={18} className="text-yellow-400" />
          </div>
          <p className="font-display text-white text-3xl">{ticketCount}</p>
          <p className="text-white/50 text-sm">
            {ticketCount === 1 ? "Ticket" : "Tickets"}
          </p>
          <p className="text-yellow-400 text-xs mt-1 group-hover:translate-x-1 transition-transform">View tickets →</p>
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center mb-3">
            <Star size={18} className="text-green-400" />
          </div>
          <p className="font-display text-white text-3xl">{loyaltyPoints.toLocaleString()}</p>
          <p className="text-white/50 text-sm">Loyalty Points</p>
          <Link href="/earn-points" className="text-green-400 text-xs mt-1 hover:text-green-300 transition-colors block">
            Earn more →
          </Link>
        </motion.div>
      </div>

      {/* No tickets CTA */}
      {ticketCount === 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white/[0.03] border border-dashed border-white/15 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3">🎟️</p>
          <p className="font-display text-white text-2xl mb-2">GET YOUR TICKETS</p>
          <p className="text-white/40 text-sm mb-5">Join us at one of our 4 cities in 2026</p>
          <Link href="/#events"
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-full transition-all">
            Browse Events <ArrowRight size={15} />
          </Link>
        </motion.div>
      )}

      {/* Earn points quick actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <p className="text-white/30 text-xs font-bold tracking-[0.2em] uppercase mb-4">Earn Points</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Camera size={16} />, label: "Upload Photo", points: "+10 pts", href: "/earn-points", color: "#00A878" },
            { icon: <Camera size={16} />, label: "Upload Video", points: "+20 pts", href: "/earn-points", color: "#C8102E" },
            { icon: <Share2 size={16} />, label: "Social Share", points: "+50 pts", href: "/earn-points", color: "#7B2FBE" },
          ].map(item => (
            <Link key={item.label} href={item.href}
              className="flex flex-col items-center gap-2 bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-2xl p-4 text-center transition-all group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${item.color}20`, color: item.color }}>
                {item.icon}
              </div>
              <p className="text-white/70 text-xs font-medium">{item.label}</p>
              <p className="text-xs font-bold" style={{ color: item.color }}>{item.points}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Upcoming events */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/30 text-xs font-bold tracking-[0.2em] uppercase">Tour</p>
          <Link href="/#events" className="text-yellow-400 text-xs hover:text-yellow-300 transition-colors">View all →</Link>
        </div>
        <div className="space-y-2">
          {EVENTS.map(ev => (
            <Link key={ev.slug} href={`/events/${ev.slug}`}
              className="flex items-center gap-3 bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 transition-all group">
              <span className="text-xl">{ev.emoji}</span>
              <div className="flex-1">
                <p className="font-display text-base" style={{ color: ev.color }}>{ev.city}</p>
                <div className="flex items-center gap-1 text-white/30 text-xs">
                  <Calendar size={10} />
                  <span>{ev.date}</span>
                </div>
              </div>
              <span className="text-white/20 group-hover:text-yellow-400 transition-colors text-xs">Tickets →</span>
            </Link>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
