"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Calendar, ExternalLink, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

export interface LoadInEvent {
  id: string;
  slug: string;
  city: string;
  state: string;
  date: string;
  time: string;
  venue: string;
  venueDetail: string;
  venueAddress: string;
  loadInStart: string;
  loadInEnd: string;
  loadInNotes: string;
  mapUrl: string;
  mapUrl2: string;
}

const CITY_COLORS: Record<string, string> = {
  cincinnati: "#F5A623",
  cleveland: "#C8102E",
  columbus: "#00A878",
  phoenix: "#7B2FBE",
};

function cityColor(city: string) {
  return CITY_COLORS[city.toLowerCase()] || "#F5A623";
}

export default function LoadInPageClient({ events }: { events: LoadInEvent[] }) {
  const [selected, setSelected] = useState<LoadInEvent | null>(null);

  const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500] px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <>
            {!selected ? (
              <motion.div key="selector" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-10">
                  <p className="text-yellow-500/60 text-xs font-bold tracking-[0.3em] uppercase mb-3">Vendor & Food Truck Load-In</p>
                  <h1 className="font-display text-white leading-none mb-4" style={{ fontSize: "clamp(2.2rem, 6vw, 3.5rem)" }}>
                    PICK THE CITY YOU&apos;LL<br />BE <span className="text-shimmer">ATTENDING</span>
                  </h1>
                  <p className="text-white/50 text-base max-w-lg mx-auto">
                    Select your city below for all load-in information — time window, venue map, and directions.
                  </p>
                </div>

                {events.length === 0 ? (
                  <p className="text-white/40 text-center">No upcoming events found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {events.map(ev => {
                      const color = cityColor(ev.city);
                      return (
                        <button key={ev.id} onClick={() => setSelected(ev)}
                          className="text-left rounded-3xl border p-6 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                          style={{ borderColor: `${color}40`, background: `${color}0d` }}>
                          <p className="font-display text-2xl text-white mb-1">{ev.city.toUpperCase()}</p>
                          <p className="text-white/50 text-sm flex items-center gap-1.5"><Calendar size={13} /> {ev.date}</p>
                          {ev.venue && <p className="text-white/35 text-xs mt-1 flex items-center gap-1.5"><MapPin size={12} /> {ev.venue}</p>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <button onClick={() => setSelected(null)}
                  className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-6 transition-colors cursor-pointer">
                  <ArrowLeft size={14} /> Choose a different city
                </button>

                <div className="mb-2">
                  <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: cityColor(selected.city) }}>Load-In Info</p>
                  <h1 className="font-display text-white leading-none mb-6" style={{ fontSize: "clamp(2.2rem, 6vw, 3.2rem)" }}>
                    TEQUILA FEST {selected.city.toUpperCase()}
                  </h1>
                </div>

                {/* Event info */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="mt-0.5 flex-shrink-0" style={{ color: cityColor(selected.city) }} />
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider">Date & Time</p>
                        <p className="text-white font-semibold">{selected.date}</p>
                        {selected.time && <p className="text-white/50 text-sm">{selected.time}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="mt-0.5 flex-shrink-0" style={{ color: cityColor(selected.city) }} />
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider">Location</p>
                        <p className="text-white font-semibold">{selected.venue}</p>
                        {selected.venueDetail && <p className="text-white/50 text-sm">{selected.venueDetail}</p>}
                        {selected.venueAddress && (
                          <a href={mapsUrl(selected.venueAddress)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm mt-1 hover:underline" style={{ color: cityColor(selected.city) }}>
                            Open in Google Maps <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Load-in window */}
                {(selected.loadInStart || selected.loadInEnd) && (
                  <div className="rounded-2xl border p-6 mb-5" style={{ borderColor: `${cityColor(selected.city)}40`, background: `${cityColor(selected.city)}0d` }}>
                    <div className="flex items-center gap-3 mb-1">
                      <Clock size={18} style={{ color: cityColor(selected.city) }} />
                      <p className="text-white font-bold uppercase tracking-wider text-sm">Load-In Window</p>
                    </div>
                    <p className="text-white/80 text-lg mt-2">
                      {selected.loadInStart || "TBD"} <span className="text-white/30 mx-1">→</span> {selected.loadInEnd || "TBD"}
                    </p>
                    {selected.loadInEnd && (
                      <p className="text-white/50 text-sm mt-1">You must be on-site and unloaded by {selected.loadInEnd}. Setup after.</p>
                    )}
                  </div>
                )}

                {/* Notes paragraph */}
                {selected.loadInNotes && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-5">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Details</p>
                    <p className="text-white/75 text-sm leading-relaxed whitespace-pre-line">{selected.loadInNotes}</p>
                  </div>
                )}

                {/* Map */}
                {selected.mapUrl && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-5">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-2">Venue Map</p>
                    <a href={selected.mapUrl} target="_blank" rel="noopener noreferrer">
                      <img src={selected.mapUrl} alt={`${selected.city} venue map`} className="w-full rounded-xl" />
                    </a>
                  </div>
                )}

                {/* Second map */}
                {selected.mapUrl2 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-2">Additional Map</p>
                    <a href={selected.mapUrl2} target="_blank" rel="noopener noreferrer">
                      <img src={selected.mapUrl2} alt={`${selected.city} additional map`} className="w-full rounded-xl" />
                    </a>
                  </div>
                )}

                {!selected.loadInStart && !selected.loadInNotes && !selected.mapUrl && (
                  <p className="text-white/30 text-sm text-center py-6">Load-in details for this event haven&apos;t been posted yet — check back soon.</p>
                )}
              </motion.div>
            )}
          </>
        </div>
      </main>

      <Footer />
    </>
  );
}
