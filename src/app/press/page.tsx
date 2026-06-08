"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, FileText, Mic, CheckCircle, Send, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Turnstile from "@/components/Turnstile";


const MEDIA_TYPES = [
  { icon: <Camera size={20} />, title: "Photographers", desc: "Apply for a media credential to capture the festival experience." },
  { icon: <Mic size={20} />, title: "Press & Journalists", desc: "Interview organizers, brand reps, and celebrity guests." },
  { icon: <FileText size={20} />, title: "Content Creators", desc: "Film, blog, podcast — cover Tequila Fest USA for your audience." },
];

const EVENTS = [
  { city: "Cincinnati", date: "June 13, 2026", venue: "TBD" },
  { city: "Cleveland", date: "July 25, 2026", venue: "TBD" },
  { city: "Columbus", date: "Aug 8, 2026", venue: "TBD" },
  { city: "Phoenix", date: "Nov 14, 2026", venue: "TBD" },
];

const FAST_FACTS = [
  "Founded: 2024",
  "2026 Tour: 4 cities across the US",
  "Avg attendance: 500–2,000 per event",
  "50+ tequila brands per event",
  "VIP & General Admission experiences",
  "Loyalty rewards program for attendees",
];

export default function PressPage() {
  const [form, setForm] = useState({ name: "", outlet: "", email: "", phone: "", type: "", city: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!captchaToken) {
      setError("Please complete the verification challenge.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: "Press / Media",
          message: `Outlet/Publication: ${form.outlet}\nMedia Type: ${form.type}\nEvent/City: ${form.city}\n\n${form.description}`,
          captchaToken,
        }),
      });
      const data = await res.json();
      if (res.ok) setSubmitted(true);
      else {
        setError(data.error || "Something went wrong. Please try again.");
        setCaptchaToken("");
      }
    } catch {
      setError("Network error. Please try again.");
      setCaptchaToken("");
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
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Media & Press</p>
            <h1 className="font-display leading-none" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">PRESS</span>{" "}
              <span className="text-shimmer-blue">KIT</span>
            </h1>
            <p className="text-white/50 mt-4 max-w-2xl mx-auto text-lg">
              Media credentials, brand assets, event facts, and press contact for Tequila Fest USA 2026.
            </p>
          </motion.div>
        </section>

        <div className="max-w-6xl mx-auto px-4 pb-24 space-y-20">

          {/* Media types */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {MEDIA_TYPES.map((m, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mb-4">
                    {m.icon}
                  </div>
                  <h3 className="text-white font-bold text-base mb-1.5">{m.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Brand assets */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
              <h2 className="font-display text-white text-2xl mb-2">BRAND ASSETS</h2>
              <p className="text-white/40 text-sm mb-6">Logos, event photos, and brand guidelines for editorial use.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["Logos (PNG / SVG)", "Event Photography", "Brand Guidelines"].map((asset, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                    <span className="text-white/60 text-sm">{asset}</span>
                    <div className="flex items-center gap-1.5 text-yellow-400/60 text-xs">
                      <Download size={12} />
                      <span>Request</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/25 text-xs mt-4">Assets provided after credential request is approved.</p>
            </div>
          </motion.div>

          {/* Fast facts + Events side by side */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fast facts */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                <h2 className="font-display text-white text-xl mb-4">FAST FACTS</h2>
                <ul className="space-y-2.5">
                  {FAST_FACTS.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
                      <span className="text-yellow-400 flex-shrink-0">▸</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {/* 2026 Events */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                <h2 className="font-display text-white text-xl mb-4">2026 TOUR</h2>
                <div className="space-y-3">
                  {EVENTS.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-white font-semibold text-sm">{ev.city}</p>
                        <p className="text-white/30 text-xs">{ev.venue}</p>
                      </div>
                      <p className="text-yellow-400 text-sm font-medium">{ev.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Press quote */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-8 text-center">
              <p className="text-yellow-400/50 text-4xl font-serif mb-4">&ldquo;</p>
              <p className="text-white/70 text-lg italic max-w-2xl mx-auto">
                Tequila Fest USA brings together the finest agave spirits and the most passionate tequila community in the country — one city at a time.
              </p>
              <p className="text-white/30 text-sm mt-4">— Tequila Fest USA Press Office</p>
            </div>
          </motion.div>

          {/* Credential request form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="font-display text-white text-3xl mb-8 text-center">REQUEST CREDENTIALS</h2>
            {submitted ? (
              <div className="max-w-lg mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-12 text-center">
                <CheckCircle size={48} className="text-yellow-400 mx-auto mb-4" />
                <p className="font-display text-yellow-400 text-2xl mb-2">REQUEST RECEIVED!</p>
                <p className="text-white/50">Our press team will respond within 2–3 business days.</p>
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
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Publication / Outlet *</label>
                      <input type="text" value={form.outlet} onChange={set("outlet")} required placeholder="Publication or channel name"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" value={form.email} onChange={set("email")} required placeholder="your@outlet.com"
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
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Media Type *</label>
                      <select value={form.type} onChange={set("type")} required
                        className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm cursor-pointer">
                        <option value="" className="bg-[#0d0500]">Select type</option>
                        <option value="Print / Online Press" className="bg-[#0d0500]">Print / Online Press</option>
                        <option value="Photographer" className="bg-[#0d0500]">Photographer</option>
                        <option value="Video / Videographer" className="bg-[#0d0500]">Video / Videographer</option>
                        <option value="Podcast" className="bg-[#0d0500]">Podcast</option>
                        <option value="Social Media / Creator" className="bg-[#0d0500]">Social Media / Creator</option>
                        <option value="Other" className="bg-[#0d0500]">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Event / City *</label>
                      <select value={form.city} onChange={set("city")} required
                        className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm cursor-pointer">
                        <option value="" className="bg-[#0d0500]">Select city</option>
                        <option value="Cincinnati (Jun 13)" className="bg-[#0d0500]">Cincinnati — Jun 13</option>
                        <option value="Cleveland (Jul 25)" className="bg-[#0d0500]">Cleveland — Jul 25</option>
                        <option value="Columbus (Aug 8)" className="bg-[#0d0500]">Columbus — Aug 8</option>
                        <option value="Phoenix (Nov 14)" className="bg-[#0d0500]">Phoenix — Nov 14</option>
                        <option value="Multiple events" className="bg-[#0d0500]">Multiple events</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Coverage Plans / Links *</label>
                    <textarea value={form.description} onChange={set("description")} required rows={4}
                      placeholder="Describe your planned coverage, link to your publication or recent work..."
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm resize-none" />
                  </div>
                  
                  <Turnstile
                    onVerify={setCaptchaToken}
                    onError={() => setCaptchaToken("")}
                    onExpire={() => setCaptchaToken("")}
                  />

                  <button type="submit" disabled={loading || !captchaToken}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                    {loading ? "Submitting..." : <><Send size={16} /> REQUEST CREDENTIALS</>}
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
