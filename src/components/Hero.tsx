"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Confetti from "./Confetti";

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0d0500]">
      {/* Radial gradient background */}
      <div className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(245,166,35,0.12) 0%, rgba(200,16,46,0.08) 40%, #0d0500 70%)",
        }}
      />
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F5A623' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {mounted && <Confetti />}

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-6xl mx-auto w-full pt-8 pb-24">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="mb-4"
        >
          <Image
            src="/tequilafest_usa.png"
            alt="Tequila Fest USA"
            width={320}
            height={320}
            priority
            className="mx-auto w-40 sm:w-56 md:w-72 drop-shadow-2xl"
          />
        </motion.div>

        {/* Tour badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-5 py-2 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-sm font-bold tracking-[0.2em] uppercase">2026 National Tour · 4 Cities</span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display leading-none"
          style={{ fontSize: "clamp(4rem, 14vw, 12rem)" }}
        >
          <span className="text-shimmer">TEQUILA</span>
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="font-display leading-none flex items-baseline justify-center gap-4 flex-wrap"
          style={{ fontSize: "clamp(3rem, 10vw, 9rem)", marginTop: "-0.1em" }}
        >
          <span className="text-shimmer-blue">FEST</span>
          <span className="text-white">USA</span>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-white/70 text-lg md:text-xl max-w-2xl mx-auto"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          The premier tequila festival touring America — 50+ premium tequilas,
          authentic cuisine, live entertainment & more.
        </motion.p>

        {/* City tour pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {[
            { city: "Cincinnati", date: "Jun 13", color: "#F5A623" },
            { city: "Cleveland", date: "Jul 25", color: "#C8102E" },
            { city: "Columbus", date: "Aug 8", color: "#00A878" },
            { city: "Phoenix", date: "Nov 14", color: "#7B2FBE" },
          ].map((stop) => (
            <div
              key={stop.city}
              className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stop.color }} />
              <span className="text-white font-semibold text-sm">{stop.city}</span>
              <span className="text-white/40 text-xs">{stop.date}</span>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <a
            href="#events"
            className="animate-pulse-glow cursor-pointer inline-flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-10 py-5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <span>GET TICKETS</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a
            href="#events"
            className="cursor-pointer inline-flex items-center gap-2 border border-white/30 hover:border-white/60 text-white/80 hover:text-white text-lg px-8 py-4 rounded-full transition-all duration-200"
          >
            View All Cities
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-6 text-white/30 text-sm tracking-wider"
        >
          Must be 21+ to attend · Tickets sold exclusively at TequilaFestUSA.com
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
      >
        <span className="text-white/30 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent animate-float" />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 z-20 papel-picado-border opacity-60" />
    </section>
  );
}
