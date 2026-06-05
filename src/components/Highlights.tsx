"use client";

import { motion } from "framer-motion";

const ITEMS = [
  {
    icon: "🥃",
    title: "50+ Premium Tequilas",
    desc: "Taste from the finest blanco, reposado, and añejo expressions — including rare and craft bottles.",
  },
  {
    icon: "🎵",
    title: "Live Entertainment",
    desc: "Bands, DJs, and performers bringing the fiesta energy all night long.",
  },
  {
    icon: "🌮",
    title: "Authentic Cuisine",
    desc: "Tacos, street food, and Mexican-inspired dishes from local vendors and food trucks.",
  },
  {
    icon: "🎁",
    title: "Souvenir Item",
    desc: "Every ticket includes an exclusive Tequila Fest USA souvenir to take home.",
  },
  {
    icon: "⭐",
    title: "VIP Experience",
    desc: "Upgrade to VIP for early access, premium pours, dedicated lounge, and more.",
  },
  {
    icon: "🛍️",
    title: "Vendors & Artisans",
    desc: "Browse local artisan markets, tequila accessories, and unique finds at every stop.",
  },
];

export default function Highlights() {
  return (
    <section className="py-24 px-4 bg-[#0a0300]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">The Experience</p>
          <h2
            className="font-display text-white"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
          >
            WHAT&apos;S{" "}
            <span className="text-shimmer">INCLUDED</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 hover:bg-white/[0.05] transition-all duration-300"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-display text-yellow-400 text-xl mb-2">{item.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
