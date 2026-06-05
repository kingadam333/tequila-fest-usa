"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <section className="py-24 px-4 bg-[#0a0300]">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Stay in the Loop</p>
          <h2 className="font-display text-white mb-4" style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}>
            DON&apos;T MISS A <span className="text-shimmer">DROP</span>
          </h2>
          <p className="text-white/50 mb-8">
            Get early access to ticket sales, exclusive presales, city announcements, and festival updates.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8"
            >
              <p className="text-4xl mb-3">🥃</p>
              <p className="font-display text-yellow-400 text-2xl">YOU&apos;RE IN!</p>
              <p className="text-white/50 mt-2">Check your inbox for your welcome email.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 bg-white/5 border border-white/20 rounded-full px-6 py-4 text-white placeholder-white/30 outline-none focus:border-yellow-500/50 transition-colors duration-200"
              />
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                SUBSCRIBE
              </button>
            </form>
          )}

          <p className="mt-4 text-white/20 text-xs">No spam, ever. Unsubscribe anytime.</p>
        </motion.div>
      </div>
    </section>
  );
}
