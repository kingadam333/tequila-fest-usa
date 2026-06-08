"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Mail, MapPin, Users, Sparkles, Wine, Send } from "lucide-react";

import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Turnstile from "@/components/Turnstile";

const PACKAGES = [
  {
    name: "Pour Partner",
    price: "$1,500",
    perCity: true,
    tagline: "Get on the floor and start pouring",
    color: "#C0C0C0",
    popular: false,
    features: [
      "Branded pour station at one festival city",
      "Up to 2 SKUs sampled to all VIP & GA attendees",
      "Logo on event website + email blast",
      "2 staff entry passes",
      "Post-event attendee count & demographics",
    ],
  },
  {
    name: "Featured Brand",
    price: "$3,500",
    perCity: true,
    tagline: "Premium placement + marketing",
    color: "#F5A623",
    popular: true,
    features: [
      "Premium pour station with priority placement",
      "Up to 4 SKUs sampled across VIP & GA",
      "Featured listing on event website + social posts (3+)",
      "Branded signage at entry & main stage",
      "4 staff entry passes + 4 VIP guest tickets",
      "Co-branded email to ticket buyers",
      "Post-event leads + analytics report",
    ],
  },
  {
    name: "Headlining Brand",
    price: "$7,500",
    perCity: true,
    tagline: "Own the festival in one city",
    color: "#C8102E",
    popular: false,
    features: [
      "Largest branded activation footprint",
      "Unlimited SKUs sampled — VIP, GA, and after-party",
      "Title sponsor of one stage / lounge / area",
      "Dedicated social campaign + influencer collab",
      "Logo lockup with Tequila Fest USA on event creative",
      "8 staff passes + 10 VIP guest tickets",
      "First right of refusal for next year",
      "Full lead capture & sales-tracking report",
    ],
  },
  {
    name: "National Brand",
    price: "$24,000",
    perCity: false,
    tagline: "All 4 cities · full season",
    color: "#7B2FBE",
    popular: false,
    features: [
      "Headlining Brand benefits in all 4 cities",
      "National title sponsor consideration",
      "Year-round content collaboration",
      "Custom on-site activation (truck, lounge, etc.)",
      "Dedicated brand manager",
      "Priority on 2027 season planning",
      "Save vs. four single-city packages",
    ],
  },
];

const STATS = [
  { icon: <Users size={20} />, value: "20,000+", label: "Fans across 4 cities" },
  { icon: <MapPin size={20} />, value: "4", label: "Major U.S. markets" },
  { icon: <Wine size={20} />, value: "60+", label: "Tequila brands featured" },
  { icon: <Sparkles size={20} />, value: "100%", label: "21+ qualified buyers" },
];

const CITIES = [
  { city: "Cincinnati", date: "June 13, 2026" },
  { city: "Cleveland", date: "July 25, 2026" },
  { city: "Columbus", date: "Aug 8, 2026" },
  { city: "Phoenix", date: "Nov 14, 2026" },
];

export default function BrandPackagesPage() {
  const [form, setForm] = useState({ name: "", email: "", brand: "", phone: "", message: "", subject: "Brand Inquiry" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: "Brand Inquiry",
          message: `Brand: ${form.brand}\n\n${form.message}`,
          captchaToken,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setCaptchaToken("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <OfficialBanner />
      <Navbar />
      <main className="bg-[#0d0500] min-h-screen pt-24 pb-24">
        {/* HERO */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <p className="text-yellow-400 text-xs uppercase tracking-[4px] font-bold mb-4">Brand Packages</p>
            <h1 className="font-display text-white text-4xl sm:text-5xl lg:text-6xl tracking-wider mb-5">
              ADD YOUR TEQUILA BRAND
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
              Pour, sample, and sell to <span className="text-yellow-400 font-semibold">thousands of qualified 21+ tequila fans</span> across four major U.S. markets in 2026.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-12">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-center">
                <div className="text-yellow-400 mb-2 flex justify-center">{s.icon}</div>
                <p className="text-white text-2xl font-bold font-display">{s.value}</p>
                <p className="text-white/40 text-xs mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CITIES */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <p className="text-white/30 text-xs uppercase tracking-[3px] text-center mb-5">2026 Festival Tour</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CITIES.map(c => (
              <div key={c.city} className="bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-white font-semibold">{c.city}</p>
                <p className="text-white/40 text-xs">{c.date}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PACKAGES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-white text-3xl sm:text-4xl tracking-wider mb-3">CHOOSE YOUR PACKAGE</h2>
            <p className="text-white/50 text-sm max-w-2xl mx-auto">All packages include on-site sampling rights, attendee data, and post-event reporting. Custom builds available.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PACKAGES.map((pkg, i) => (
              <motion.div key={pkg.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}
                className={`relative rounded-2xl border p-6 flex flex-col ${pkg.popular ? "bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/40" : "bg-white/[0.03] border-white/10"}`}>
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-yellow-500 text-black text-[10px] font-bold tracking-widest uppercase">
                    Most Popular
                  </span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${pkg.color}18`, color: pkg.color, border: `1px solid ${pkg.color}30` }}>
                    <Wine size={18} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg leading-tight">{pkg.name}</p>
                    <p className="text-white/40 text-xs">{pkg.tagline}</p>
                  </div>
                </div>

                <div className="mb-5 pb-5 border-b border-white/10">
                  <p className="font-display text-3xl text-white">{pkg.price}</p>
                  <p className="text-white/40 text-xs mt-1">{pkg.perCity ? "per city" : "all 4 cities · season"}</p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                      <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: pkg.color }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a href="#inquire" className={`block text-center px-4 py-2.5 rounded-xl text-sm font-bold tracking-wider transition-all cursor-pointer ${pkg.popular ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "border border-white/15 hover:border-yellow-500/40 text-white hover:text-yellow-400"}`}>
                  REQUEST INFO
                </a>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-white/40 text-sm mt-10">
            Looking for something custom? <a href="#inquire" className="text-yellow-400 hover:text-yellow-300 underline">Tell us what you're after</a>.
          </p>
        </section>

        {/* INQUIRE FORM */}
        <section id="inquire" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-10">
            <h2 className="font-display text-white text-3xl sm:text-4xl tracking-wider mb-3">GET IN TOUCH</h2>
            <p className="text-white/50 text-sm">Tell us about your brand. We'll send a deck and follow up within 1–2 business days.</p>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-10">
                <p className="text-yellow-400 text-3xl font-display mb-2">¡SALUD!</p>
                <p className="text-white/70">Thanks — we'll be in touch shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Your Name *</label>
                    <input required value={form.name} onChange={set("name")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-white/30" placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Brand Name *</label>
                    <input required value={form.brand} onChange={set("brand")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-white/30" placeholder="Casa Tequila" />
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Email *</label>
                    <input required type="email" value={form.email} onChange={set("email")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-white/30" placeholder="you@brand.com" />
                  </div>
                  <div>
                    <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Phone</label>
                    <input type="tel" value={form.phone} onChange={set("phone")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-white/30" placeholder="(555) 000-0000" />
                  </div>
                </div>
                <div>
                  <label className="block text-white/40 text-xs uppercase tracking-wider mb-1.5">Tell us about your brand & goals *</label>
                  <textarea required rows={5} value={form.message} onChange={set("message")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-white/30 resize-none" placeholder="Distribution, target cities, package interest, anything else we should know…" />
                </div>

                <Turnstile onVerify={setCaptchaToken} onError={() => setCaptchaToken("")} onExpire={() => setCaptchaToken("")} />

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button type="submit" disabled={loading || !captchaToken}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold tracking-widest text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer">
                  {loading ? "SENDING…" : <><Send size={15} /> SEND INQUIRY</>}
                </button>
              </form>
            )}
          </div>

          <div className="text-center mt-8">
            <p className="text-white/40 text-sm">Prefer email? <a href="mailto:brands@mail.tequilafestusa.com" className="text-yellow-400 hover:text-yellow-300 underline">brands@mail.tequilafestusa.com</a></p>
            <p className="mt-4">
              <Link href="/contact" className="text-white/40 hover:text-white text-sm transition-colors">← Back to contact</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
