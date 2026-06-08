"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Users, MapPin, CheckCircle, Send, Utensils, Package } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Turnstile from "@/components/Turnstile";

const VENDOR_TYPES = [
  { icon: <Utensils size={20} />, title: "Food Vendors", desc: "Serve food that pairs perfectly with tequila — tacos, elotes, appetizers, and more." },
  { icon: <Package size={20} />, title: "Merchandise", desc: "Sell branded goods, apparel, accessories, or tequila-themed products." },
  { icon: <ShoppingBag size={20} />, title: "Specialty Products", desc: "Hot sauces, mixers, spirits accessories, glassware, and unique finds." },
];

const WHAT_TO_EXPECT = [
  "500–2,000 attendees per event (venue dependent)",
  "4–6 hour event window",
  "Dedicated vendor area with foot traffic",
  "Electric hookup available (limited — first come)",
  "Event promotion includes vendor lineup",
  "Load-in 2 hours before doors open",
];

const CITIES = [
  { city: "Cincinnati", date: "June 13, 2026", status: "Upcoming" },
  { city: "Cleveland", date: "July 25, 2026", status: "Open" },
  { city: "Columbus", date: "Aug 8, 2026", status: "Open" },
  { city: "Phoenix", date: "Nov 14, 2026", status: "Open" },
];

export default function VendorsPage() {
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", type: "", cities: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/vendor-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          business: form.business,
          email: form.email,
          phone: form.phone,
          type: form.type,
          cities: form.cities ? [form.cities] : [],
          description: form.description,
          captchaToken,
        }),
      });
      const data = await res.json();
      if (res.ok) setSubmitted(true);
      else setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(245,166,35,0.07) 0%, transparent 55%)" }} />

        {/* Hero */}
        <section className="relative pt-20 pb-16 px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Sell at Our Festivals</p>
            <h1 className="font-display leading-none" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">VENDOR</span>{" "}
              <span className="text-shimmer-blue">APPLICATION</span>
            </h1>
            <p className="text-white/50 mt-4 max-w-2xl mx-auto text-lg">
              Join the Tequila Fest USA marketplace. Put your business in front of thousands of food and spirits enthusiasts across 4 cities.
            </p>
          </motion.div>
        </section>

        <div className="max-w-6xl mx-auto px-4 pb-24 space-y-20">

          {/* Vendor types */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {VENDOR_TYPES.map((v, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mb-4">
                    {v.icon}
                  </div>
                  <h3 className="text-white font-bold text-base mb-1.5">{v.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Event dates */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="font-display text-white text-3xl text-center mb-8">2026 EVENTS</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {CITIES.map((c, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
                  <MapPin size={16} className="text-yellow-400 mx-auto mb-2" />
                  <p className="text-white font-bold">{c.city}</p>
                  <p className="text-white/40 text-xs mt-1">{c.date}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* What to expect */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Users size={22} className="text-yellow-400" />
                <h2 className="font-display text-white text-2xl">WHAT TO EXPECT</h2>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WHAT_TO_EXPECT.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/60 text-sm">
                    <span className="text-yellow-400 mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Application form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="font-display text-white text-3xl mb-8 text-center">APPLY TO VEND</h2>
            {submitted ? (
              <div className="max-w-lg mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-12 text-center">
                <CheckCircle size={48} className="text-yellow-400 mx-auto mb-4" />
                <p className="font-display text-yellow-400 text-2xl mb-2">APPLICATION RECEIVED!</p>
                <p className="text-white/50">We&apos;ll review your application and follow up within 3–5 business days.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Your Name *</label>
                      <input type="text" value={form.name} onChange={set("name")} required placeholder="Your name"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Business Name *</label>
                      <input type="text" value={form.business} onChange={set("business")} required placeholder="Your business name"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" value={form.email} onChange={set("email")} required placeholder="your@email.com"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Phone</label>
                      <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Vendor Type *</label>
                      <select value={form.type} onChange={set("type")} required
                        className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm cursor-pointer">
                        <option value="" className="bg-[#0d0500]">Select type</option>
                        <option value="Food" className="bg-[#0d0500]">Food Vendor</option>
                        <option value="Merchandise" className="bg-[#0d0500]">Merchandise</option>
                        <option value="Specialty Product" className="bg-[#0d0500]">Specialty Product</option>
                        <option value="Other" className="bg-[#0d0500]">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Cities Interested In *</label>
                      <select value={form.cities} onChange={set("cities")} required
                        className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm cursor-pointer">
                        <option value="" className="bg-[#0d0500]">Select cities</option>
                        <option value="Cincinnati only" className="bg-[#0d0500]">Cincinnati only</option>
                        <option value="Cleveland only" className="bg-[#0d0500]">Cleveland only</option>
                        <option value="Columbus only" className="bg-[#0d0500]">Columbus only</option>
                        <option value="Phoenix only" className="bg-[#0d0500]">Phoenix only</option>
                        <option value="Multiple cities" className="bg-[#0d0500]">Multiple cities</option>
                        <option value="All cities" className="bg-[#0d0500]">All cities</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Describe Your Products / Menu *</label>
                    <textarea value={form.description} onChange={set("description")} required rows={4}
                      placeholder="Tell us what you sell, your setup size, any power needs, and why you'd be a great fit..."
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm resize-none" />
                  </div>
                  <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />
                  <button type="submit" disabled={loading || !captchaToken}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                    {loading ? "Submitting..." : <><Send size={16} /> SUBMIT APPLICATION</>}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
