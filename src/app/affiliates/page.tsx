"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Link2, Users, TrendingUp, CheckCircle, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Turnstile from "@/components/Turnstile";

const PERKS = [
  { icon: <DollarSign size={22} />, title: "Earn Commission", desc: "Get paid for every ticket sold through your unique referral link." },
  { icon: <Link2 size={22} />, title: "Unique Tracking Link", desc: "Your personal link tracks every click and conversion automatically." },
  { icon: <Users size={22} />, title: "No Cap on Earnings", desc: "The more you promote, the more you earn. No limits, no ceiling." },
  { icon: <TrendingUp size={22} />, title: "Real-Time Dashboard", desc: "Track clicks, conversions, and commissions in your account." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Apply Below", desc: "Fill out the form and we'll review your application within 48 hours." },
  { step: "02", title: "Get Your Link", desc: "We'll send you a unique tracking link for each city event." },
  { step: "03", title: "Promote & Earn", desc: "Share on social, email, or your site. Earn commission on every sale." },
  { step: "04", title: "Get Paid", desc: "Commissions are paid out monthly via PayPal or direct deposit." },
];

export default function AffiliatesPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", platform: "", audience: "", message: "" });
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: "Affiliate Program",
          message: `Platform/Channel: ${form.platform}\nAudience Size: ${form.audience}\n\n${form.message}`,
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
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Partner With Us</p>
            <h1 className="font-display leading-none" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">AFFILIATE</span>{" "}
              <span className="text-shimmer-blue">PROGRAM</span>
            </h1>
            <p className="text-white/50 mt-4 max-w-2xl mx-auto text-lg">
              Love tequila? Love free money? Promote Tequila Fest USA and earn commission on every ticket you sell.
            </p>
          </motion.div>
        </section>

        <div className="max-w-6xl mx-auto px-4 pb-24 space-y-20">

          {/* Perks */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PERKS.map((p, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                  <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mb-4">
                    {p.icon}
                  </div>
                  <h3 className="text-white font-bold text-base mb-1.5">{p.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="font-display text-white text-center text-3xl mb-10">HOW IT WORKS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="font-display text-yellow-500/30 text-5xl mb-3">{s.step}</p>
                  <h3 className="text-white font-bold mb-2">{s.title}</h3>
                  <p className="text-white/40 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Commission callout */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-8 text-center">
              <p className="text-yellow-400 text-sm font-bold tracking-widest uppercase mb-2">Commission Rate</p>
              <p className="font-display text-white text-6xl mb-2">10%</p>
              <p className="text-white/50">per ticket sold through your link. No cap. No minimum sales required.</p>
            </div>
          </motion.div>

          {/* Application form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h2 className="font-display text-white text-3xl mb-8 text-center">APPLY NOW</h2>
            {submitted ? (
              <div className="max-w-lg mx-auto bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-12 text-center">
                <CheckCircle size={48} className="text-yellow-400 mx-auto mb-4" />
                <p className="font-display text-yellow-400 text-2xl mb-2">APPLICATION RECEIVED!</p>
                <p className="text-white/50">We&apos;ll review your application and reach out within 48 hours.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                {error && (
                  <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Full Name *</label>
                      <input type="text" value={form.name} onChange={set("name")} required placeholder="Your name"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" value={form.email} onChange={set("email")} required placeholder="your@email.com"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Phone <span className="text-white/20 normal-case">(optional)</span></label>
                      <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Platform / Channel *</label>
                      <input type="text" value={form.platform} onChange={set("platform")} required placeholder="Instagram, TikTok, Blog..."
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Audience Size</label>
                    <select value={form.audience} onChange={set("audience")}
                      className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm cursor-pointer">
                      <option value="" className="bg-[#0d0500]">Select range</option>
                      <option value="Under 1K" className="bg-[#0d0500]">Under 1,000</option>
                      <option value="1K–5K" className="bg-[#0d0500]">1,000 – 5,000</option>
                      <option value="5K–25K" className="bg-[#0d0500]">5,000 – 25,000</option>
                      <option value="25K–100K" className="bg-[#0d0500]">25,000 – 100,000</option>
                      <option value="100K+" className="bg-[#0d0500]">100,000+</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Tell Us About Yourself</label>
                    <textarea value={form.message} onChange={set("message")} rows={4} placeholder="How do you plan to promote Tequila Fest USA? Link to your profile or site..."
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm resize-none" />
                  </div>
                  <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />
                  <button type="submit" disabled={loading || !captchaToken}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                    {loading ? "Submitting..." : <><Send size={16} /> APPLY NOW</>}
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
