"use client";

import { motion } from "framer-motion";

const VIP_PERKS = [
  "Early entry — skip the general line",
  "Premium VIP lounge access",
  "Exclusive rare & reserve pours",
  "Dedicated VIP bartenders",
  "Complimentary appetizers",
  "VIP-only gift bag",
  "Priority seating",
  "Commemorative VIP lanyard",
];

export default function VIPSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden bg-[#0d0500]">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(192,192,192,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <p className="text-[#C0C0C0] text-xs font-bold tracking-[0.4em] uppercase mb-3">Upgrade Your Experience</p>
          <h2
            className="font-display text-shimmer-platinum"
            style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
          >
            VIP EXPERIENCE
          </h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto">
            Elevate your festival experience with exclusive access, premium pours, and luxury amenities.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-3xl p-8 md:p-12 border border-[#C0C0C0]/20"
          style={{
            background: "linear-gradient(135deg, rgba(192,192,192,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(192,192,192,0.06) 100%)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {VIP_PERKS.map((perk, i) => (
              <motion.div
                key={perk}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full border border-[#C0C0C0]/40 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" strokeWidth="2.5" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span className="text-white/70 text-sm">{perk}</span>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-[#C0C0C0]/50 text-sm mb-2 tracking-widest uppercase">VIP Add-On</p>
            <p className="font-display text-shimmer-platinum mb-6" style={{ fontSize: "3rem" }}>
              ADD AT CHECKOUT
            </p>
            <a
              href="#events"
              className="inline-flex items-center gap-3 font-bold text-lg px-10 py-4 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #888, #d0d0d0, #fff, #d0d0d0)", color: "#0d0500" }}
            >
              Choose Your City
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
