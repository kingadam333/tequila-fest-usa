"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function OfficialBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-0 overflow-hidden z-50"
      style={{
        background: "linear-gradient(90deg, #0d0500 0%, #1a1008 20%, #2a1a05 40%, #1a1008 60%, #0d0500 100%)",
        borderBottom: "1px solid rgba(192,192,192,0.2)",
      }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), rgba(255,255,255,0.12), rgba(255,255,255,0.06), transparent)",
          width: "40%",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 relative">
        <div className="hidden sm:block h-px flex-1 max-w-[80px]"
          style={{ background: "linear-gradient(to right, transparent, rgba(192,192,192,0.4))" }}
        />
        <div className="w-1.5 h-1.5 rotate-45 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #C0C0C0, #fff)" }}
        />
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          <span className="text-[#888] text-xs font-bold tracking-[0.25em] uppercase whitespace-nowrap">
            Official Tequila
          </span>
          <motion.span
            className="font-display text-shimmer-platinum text-lg sm:text-xl leading-none"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            CÓDIGO 1530
          </motion.span>
          <span className="bg-[#C0C0C0]/10 border border-[#C0C0C0]/20 text-[#C0C0C0] text-xs font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap">
            Presenting Sponsor
          </span>
        </div>
        <div className="w-1.5 h-1.5 rotate-45 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #C0C0C0, #fff)" }}
        />
        <div className="hidden sm:block h-px flex-1 max-w-[80px]"
          style={{ background: "linear-gradient(to left, transparent, rgba(192,192,192,0.4))" }}
        />
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#999] transition-colors duration-200 cursor-pointer"
          aria-label="Dismiss banner"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
