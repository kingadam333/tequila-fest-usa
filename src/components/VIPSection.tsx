"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";

const vipTequilas = [
  { name: "Clase Azul", sub: "Reposado" },
  { name: "Don Julio", sub: "1942" },
  { name: "Avión", sub: "Extra Añejo 44" },
  { name: "Jose Cuervo", sub: "La Familia" },
  { name: "Suavecito", sub: "Extra Añejo" },
  { name: "Código 1530", sub: "Añejo" },
  { name: "Gran Coramino", sub: "Añejo" },
  { name: "Clase Azul", sub: "Reposado" },
  { name: "Don Julio", sub: "1942" },
  { name: "Avión", sub: "Extra Añejo 44" },
  { name: "Jose Cuervo", sub: "La Familia" },
  { name: "Suavecito", sub: "Extra Añejo" },
  { name: "Código 1530", sub: "Añejo" },
  { name: "Gran Coramino", sub: "Añejo" },
];

const perks = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 18h18M3 18l2-8 4.5 4L12 6l2.5 8L19 10l2 8H3z"/>
      </svg>
    ),
    title: "Private Lounge",
    desc: "Your own exclusive space away from the crowd — premium seating, shade, and a VIP-only atmosphere.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6M9 3v1.5a3 3 0 00-1.5 2.6V9L6 12v7a2 2 0 002 2h8a2 2 0 002-2v-7l-1.5-3V7.1A3 3 0 0015 4.5V3M9 3h6M8.5 14h7"/>
      </svg>
    ),
    title: "8 Super Premium Pours",
    desc: "Ultra-aged expressions and rare bottles you won't find on the main floor — the best of the best.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12c0 5 3.5 8 9 8s9-3 9-8"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12c0-2.5 1.5-5 4-6.5C14.5 7 16 9.5 16 12"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9.5c.5-.5 1-.8 2-.8s1.5.3 2 .8"/>
      </svg>
    ),
    title: "Build Your Own Taco Bar",
    desc: "Craft your perfect taco with premium proteins, fresh handmade salsas, and all the fixings.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
      </svg>
    ),
    title: "Priority Entry",
    desc: "Skip the line. VIP fast-track gets you in first so you can get straight to the good stuff.",
  },
];

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-white pointer-events-none"
      style={style}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
    />
  );
}

const sparklePositions = Array.from({ length: 18 }, () => ({
  top: `${Math.floor(Math.random() * 100)}%`,
  left: `${Math.floor(Math.random() * 100)}%`,
}));

export default function VIPSection() {
  return (
    <section className="relative py-28 px-4 overflow-hidden bg-[#080808]">

      {/* Deep background gradient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(180,180,180,0.06) 0%, transparent 70%)" }}
      />

      {/* Platinum border lines */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(192,192,192,0.6), rgba(255,255,255,0.9), rgba(192,192,192,0.6), transparent)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(192,192,192,0.6), rgba(255,255,255,0.9), rgba(192,192,192,0.6), transparent)" }}
      />

      {/* Sparkles */}
      {sparklePositions.map((s, i) => (
        <Sparkle key={i} style={{ top: s.top, left: s.left }} />
      ))}

      {/* Spotlight sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.06, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "conic-gradient(from 210deg at 50% 30%, transparent 0deg, rgba(255,255,255,0.4) 15deg, transparent 30deg)",
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 border border-[#C0C0C0]/30 rounded-full px-5 py-2 mb-6"
            style={{ background: "rgba(192,192,192,0.06)" }}>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-[#E8E8E8]"
            />
            <span className="text-[#C8C8C8] text-sm font-semibold tracking-widest uppercase">Exclusive Access</span>
          </div>

          <h2
            className="font-display text-shimmer-platinum leading-none"
            style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
          >
            VIP EXPERIENCE
          </h2>
          <p className="text-[#888] mt-5 max-w-xl mx-auto text-lg">
            Elevate your fiesta. A private world of the rarest tequilas, the finest food, and the best seat in the house.
          </p>
          <div className="w-24 h-px mx-auto mt-6"
            style={{ background: "linear-gradient(90deg, transparent, #C0C0C0, transparent)" }}
          />
        </motion.div>

        {/* Perks — 3D tilt cards 2×2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16" style={{ perspective: "1000px" }}>
          {perks.map((perk, i) => (
            <motion.div
              key={perk.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <TiltCard className="h-full cursor-default">
                <div
                  className="flex gap-5 rounded-2xl p-7 h-full relative overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(35,35,35,0.95), rgba(18,18,18,0.98))",
                    border: "1px solid rgba(192,192,192,0.15)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)" }}
                  />
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center relative"
                    style={{
                      background: "linear-gradient(135deg, rgba(192,192,192,0.15), rgba(120,120,120,0.08))",
                      border: "1px solid rgba(192,192,192,0.25)",
                      color: "#D8D8D8",
                      boxShadow: "0 0 12px rgba(192,192,192,0.1)",
                    }}
                  >
                    {perk.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-2 text-shimmer-platinum">{perk.title}</h3>
                    <p className="text-[#888] leading-relaxed">{perk.desc}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* VIP Exclusive Pours marquee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <p className="text-center text-[#888] text-xs font-bold tracking-[0.4em] uppercase mb-6">
            VIP Exclusive Pours
          </p>

          <div className="relative overflow-hidden rounded-2xl py-6"
            style={{
              background: "linear-gradient(145deg, rgba(25,25,25,0.95), rgba(12,12,12,0.98))",
              border: "1px solid rgba(192,192,192,0.15)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, rgba(12,12,12,1), transparent)" }}
            />
            <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to left, rgba(12,12,12,1), transparent)" }}
            />

            <div className="flex gap-6 w-max animate-marquee">
              {vipTequilas.map((t, i) => (
                <div key={i} className="flex-shrink-0 flex items-center gap-4 px-6">
                  <div className="w-1.5 h-1.5 rotate-45 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C0C0C0, #E8E8E8)" }}
                  />
                  <div className="text-center">
                    <p className="font-display text-2xl text-shimmer-platinum whitespace-nowrap">{t.name}</p>
                    <p className="text-[#666] text-xs tracking-widest uppercase mt-0.5">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA — links to events section to pick a city */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <a
            href="#events"
            className="cursor-pointer inline-flex items-center gap-3 font-bold text-xl px-12 py-5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #8a8a8a, #d4d4d4, #ffffff, #c0c0c0, #8a8a8a)",
              backgroundSize: "200% auto",
              color: "#0d0500",
              boxShadow: "0 0 30px rgba(192,192,192,0.25), inset 0 1px 0 rgba(255,255,255,0.5)",
              animation: "shimmer 3s linear infinite",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3 18h18M3 18l2-8 4.5 4L12 6l2.5 8L19 10l2 8H3z"/>
            </svg>
            <span>GET VIP TICKETS</span>
          </a>
          <p className="text-[#444] text-sm mt-4">Available at checkout · Select your city above · Limited availability</p>
        </motion.div>

      </div>

    </section>
  );
}
