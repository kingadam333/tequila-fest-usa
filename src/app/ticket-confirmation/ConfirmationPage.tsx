"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Ticket, ArrowRight, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import { getEvent } from "@/lib/events";
import Confetti from "@/components/Confetti";

export default function ConfirmationPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const eventSlug = params.get("event");
  const event = eventSlug ? getEvent(eventSlug) : null;

  const [mounted, setMounted] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Fetch customer email from session so we can prefill login
    if (sessionId) {
      fetch(`/api/session-email?session_id=${sessionId}`)
        .then(r => r.json())
        .then(d => { if (d.email) setCustomerEmail(d.email); })
        .catch(() => {});
    }
  }, [sessionId]);

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500] flex items-center justify-center px-4 py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(245,166,35,0.1) 0%, transparent 60%)" }}
        />

        {mounted && <Confetti />}

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-lg text-center"
        >
          {/* Logo */}
          <Image src="/tequilafest_usa.png" alt="Tequila Fest USA" width={100} height={100}
            className="w-20 mx-auto drop-shadow-2xl mb-6" />

          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-6"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <h1 className="font-display text-white leading-none mb-2" style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}>
              YOU&apos;RE <span className="text-shimmer">IN!</span>
            </h1>
            <p className="text-white/60 text-lg mb-2">Order confirmed</p>
            {sessionId && (
              <p className="text-white/25 text-xs font-mono mb-6">Session: {sessionId.slice(0, 24)}…</p>
            )}
          </motion.div>

          {/* Event card */}
          {event && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-8 text-left"
            >
              <div className="flex items-center gap-3 mb-1">
                <Ticket size={16} style={{ color: event.color }} />
                <span className="text-white/40 text-xs uppercase tracking-wider">Your Event</span>
              </div>
              <p className="font-display text-2xl mb-0.5" style={{ color: event.color }}>
                TEQUILA FEST {event.city.toUpperCase()}
              </p>
              <p className="text-white/60 text-sm">{event.date} · {event.time}</p>
              <p className="text-white/40 text-sm">{event.venue}, {event.venueDetail}</p>
            </motion.div>
          )}

          {/* What's next */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-8 text-left"
          >
            <p className="text-yellow-400 font-bold text-sm mb-3">What happens next:</p>
            <ul className="space-y-2">
              {[
                "Check your email — your order confirmation and account login details are in one email",
                "Log in to view your QR tickets anytime at tequilafestusa.com/account",
                "Show your QR code at the door — one scan per entry",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
                  <span className="text-yellow-500 mt-0.5 flex-shrink-0">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href={customerEmail ? `/login?email=${encodeURIComponent(customerEmail)}&redirect=/account` : "/account"}
              className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-7 py-3.5 rounded-full transition-all duration-200 hover:scale-105">
              <User size={16} />
              View My Tickets
            </Link>
            <Link href="/#events"
              className="flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white/70 hover:text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-200">
              Browse More Events
              <ArrowRight size={15} />
            </Link>
          </motion.div>

          <p className="mt-6 text-white/20 text-xs">Must be 21+ · Tickets are non-transferable · No refunds</p>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
