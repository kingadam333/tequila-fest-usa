"use client";

import { motion } from "framer-motion";

const brands = [
  "Camerena", "Avión", "Gran Coramino", "1800", "Jose Cuervo",
  "Gran Centenario", "Dobel", "Milagro", "Del Maguey", "Olmeca Altos",
  "Codigo 1530", "El Jimador", "Hornitos", "El Tesoro", "Sauza",
  "Ghost", "G4", "Los Linderos", "Suavecito", "Teremana",
  "Viva Agave", "Dolce Vida", "Corazon", "Authentico",
];

export default function TequilaSpotlight() {
  const doubled = [...brands, ...brands];

  return (
    <section className="bg-[#0d0500] py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-yellow-500 text-sm font-semibold tracking-[0.3em] uppercase mb-3">
            Sample The Best
          </p>
          <h2 className="font-display text-white" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
            50+ <span className="text-shimmer">TEQUILAS</span>
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto">
            From smooth blancos to complex añejos — explore the full spectrum of agave spirits from the world&apos;s finest distillers.
          </p>
          <div className="w-24 h-1 bg-yellow-500 mx-auto mt-4 rounded-full" />
        </motion.div>

        {/* Scrolling brand marquee — row 1 (left) */}
        <div className="relative overflow-hidden mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0d0500] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0d0500] to-transparent z-10 pointer-events-none" />
          <div className="flex gap-4 w-max animate-marquee" style={{ animationDuration: "90s" }}>
            {doubled.map((brand, i) => (
              <div
                key={i}
                className="flex-shrink-0 bg-white/5 border border-white/10 hover:border-yellow-500/40 hover:bg-white/10 rounded-2xl px-8 py-5 transition-all duration-200 cursor-default"
              >
                <p className="font-display text-yellow-400 text-2xl whitespace-nowrap">{brand}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — reverse direction */}
        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0d0500] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0d0500] to-transparent z-10 pointer-events-none" />
          <div className="flex gap-4 w-max animate-marquee-reverse" style={{ animationDuration: "90s" }}>
            {[...doubled].reverse().map((brand, i) => (
              <div
                key={i}
                className="flex-shrink-0 bg-white/5 border border-white/10 hover:border-yellow-500/40 hover:bg-white/10 rounded-2xl px-8 py-5 transition-all duration-200 cursor-default"
              >
                <p className="font-display text-white/60 text-2xl whitespace-nowrap">{brand}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tequila type breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
        >
          {[
            { type: "Blanco", desc: "Crisp & pure", color: "#fff8f0" },
            { type: "Reposado", desc: "Aged 2–12 months", color: "#F5A623" },
            { type: "Añejo", desc: "Aged 1–3 years", color: "#C8102E" },
            { type: "Extra Añejo", desc: "Aged 3+ years", color: "#7B2FBE" },
          ].map((t) => (
            <div
              key={t.type}
              className="text-center p-5 rounded-xl border border-white/10 bg-white/5"
            >
              <div className="w-3 h-3 rounded-full mx-auto mb-3" style={{ backgroundColor: t.color }} />
              <p className="font-display text-xl text-white">{t.type}</p>
              <p className="text-white/40 text-sm mt-1">{t.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
