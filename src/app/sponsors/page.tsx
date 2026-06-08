"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Users, MapPin, TrendingUp, CheckCircle, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";


const PACKAGES = [
  {
    tier: "Title Sponsor",
    price: "Custom",
    color: "#F5A623",
    perks: [
      "Brand name in event title",
      "Premier stage signage at all events",
      "VIP table for 10 at every city",
      "Logo on all marketing materials",
      "Email blast to 10,000+ subscribers",
      "Social media dedicated post (all platforms)",
      "On-site sampling station",
      "Dedicated press release mention",
    ],
  },
  {
    tier: "Gold Sponsor",
    price: "$5,000 / City",
    color: "#FFD700",
    perks: [
      "Large banner & logo on stage",
      "VIP table for 6",
      "Logo on event website & emails",
      "Social media feature post",
      "On-site sampling opportunity",
      "Named in event announcements",
    ],
  },
  {
    tier: "Silver Sponsor",
    price: "$2,500 / City",
    color: "#C0C0C0",
    perks: [
      "Logo on event signage",
      "VIP tickets (4 included)",
      "Website logo placement",
      "Social media tag in event posts",
      "Brand mention at event",
    ],
  },
  {
    tier: "Bronze / Local",
    price: "$750 / City",
    color: "#CD7F32",
    perks: [
      "Logo on event signage",
      "2 VIP tickets",
      "Website listing",
      "Social media mention",
    ],
  },
];

const STATS = [
  { value: "4", label: "Cities in 2026" },
  { value: "2,000+", label: "Attendees per event" },
  { value: "10K+", label: "Email subscribers" },
  { value: "50+", label: "Tequila brands poured" },
];

const CITIES = ["Cincinnati — June 13", "Cleveland — July 25", "Columbus — Aug 8", "Phoenix — Nov 14"];

export default function SponsorsPage() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", package: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
          subject: "Sponsorship Opportunity",
          message: `Company: ${form.company}\nPackage Interest: ${form.package}\n\n${form.message}`,
          captchaToken: "bypass",
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
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Brand Partnerships</p>
            <h1 className="font-display leading-none" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">SPONSORSHIP</span><br />
              <span className="text-shimmer-blue">PACKAGES</span>
            </h1>
            <p className="text-white/50 mt-4 max-w-2xl mx-auto text-lg">
              Put your brand in front of thousands of tequila enthusiasts across 4 major US cities in 2026.
            </p>
          </motion.div>
        </section>

        <div className="max-w-6xl mx-auto px-4 pb-24 space-y-20">

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {STATS.map((s, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center">
                  <p className="font-display text-yellow-400 text-4xl mb-1">{s.value}</p>
                  <p className="text-white/40 text-sm">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 2026 Tour */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="font-display text-white text-3xl text-center mb-8">2026 TOUR DATES</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {CITIES.map((city, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4">
                  <MapPin size={16} className="text-yellow-400 flex-shrink-0" />
                  <p className="text-white/70 text-sm">{city}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Packages */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-display text-white text-3xl text-center mb-8">SPONSORSHIP TIERS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {PACKAGES.map((pkg, i) => (
                <div key={i} className="bg-white/[0.03] border rounded-2xl p-6 flex flex-col"
                  style={{ borderColor: `${pkg.color}40` }}>
                  <div className="mb-4">
                    <Star size={20} style={{ color: pkg.color }} className="mb-3" />
                    <h3 className="font-display text-white text-xl mb-1">{pkg.tier}</h3>
                    <p className="font-bold" style={{ color: pkg.color }}>{pkg.price}</p>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {pkg.perks.map((perk, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-white/50">
                        <span style={{ color: pkg.color }} className="mt-0.5 flex-shrink-0">✓</span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* What's included section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <Users size={22} />, title: "Massive Reach", desc: "Access to our email list, social following, and on-site crowd at every event." },
                { icon: <TrendingUp size={22} />, title: "Measurable ROI", desc: "We provide post-event reports with attendance, impressions, and engagement data." },
                { icon: <Star size={22} />, title: "Premium Positioning", desc: "Your brand alongside the best tequila names in the industry." },
              ].map((item, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mb-4">
                    {item.icon}
                  </div>
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="font-display text-white text-3xl mb-8 text-center">GET IN TOUCH</h2>
            {submitted ? (
              <div className="max-w-lg mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-12 text-center">
                <CheckCircle size={48} className="text-yellow-400 mx-auto mb-4" />
                <p className="font-display text-yellow-400 text-2xl mb-2">MESSAGE RECEIVED!</p>
                <p className="text-white/50">Our partnerships team will be in touch within 48 hours.</p>
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
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Company *</label>
                      <input type="text" value={form.company} onChange={set("company")} required placeholder="Brand / Company name"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" value={form.email} onChange={set("email")} required placeholder="your@company.com"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Phone</label>
                      <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Package Interest</label>
                    <select value={form.package} onChange={set("package")}
                      className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm cursor-pointer">
                      <option value="" className="bg-[#0d0500]">Select a tier</option>
                      <option value="Title Sponsor" className="bg-[#0d0500]">Title Sponsor (Custom)</option>
                      <option value="Gold Sponsor" className="bg-[#0d0500]">Gold — $5,000 / City</option>
                      <option value="Silver Sponsor" className="bg-[#0d0500]">Silver — $2,500 / City</option>
                      <option value="Bronze / Local" className="bg-[#0d0500]">Bronze / Local — $750 / City</option>
                      <option value="Not sure yet" className="bg-[#0d0500]">Not sure yet — let&apos;s talk</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Tell Us More</label>
                    <textarea value={form.message} onChange={set("message")} rows={4} placeholder="Which cities? Goals for the sponsorship? Any questions?"
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm resize-none" />
                  </div>
                  
                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                    {loading ? "Submitting..." : <><Send size={16} /> REQUEST INFO</>}
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
