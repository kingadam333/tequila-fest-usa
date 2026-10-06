"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Users, MapPin, TrendingUp, CheckCircle, Send, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Turnstile from "@/components/Turnstile";
import HoneypotField from "@/components/HoneypotField";
import { HONEYPOT_FIELD } from "@/lib/spamGuard";
import { sponsorEventOptions, sponsorTotal, type SponsorPackage } from "@/lib/sponsorPackages";


// Card accent colors, cycled by position (packages come from admin -> Sponsors).
const ACCENTS = ["#F5A623", "#FFD700", "#C0C0C0", "#CD7F32", "#C8102E", "#7B2FBE"];

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

const STATS = [
  { value: "4", label: "Cities in 2026" },
  { value: "2,000+", label: "Attendees per event" },
  { value: "10K+", label: "Email subscribers" },
  { value: "50+", label: "Tequila brands poured" },
];

const CITIES = ["Cincinnati — June 12", "Cleveland — July 24", "Columbus — Aug 8", "Phoenix — Nov 14"];

export default function SponsorsPageClient({ packages }: { packages: SponsorPackage[] | null }) {
  const [reserving, setReserving] = useState<SponsorPackage | null>(null);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", package: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [hp, setHp] = useState("");
  

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
          subject: "Sponsorship Opportunity",
          message: `Company: ${form.company}\nPackage Interest: ${form.package}\n\n${form.message}`,
          captchaToken,
          [HONEYPOT_FIELD]: hp,
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
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Brand Partnerships</p>
            <h1 className="font-display leading-none" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">SPONSORSHIP</span><br />
              <span className="text-shimmer-blue">PACKAGES</span>
            </h1>
            <p className="text-white/80 mt-4 max-w-2xl mx-auto text-lg">
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
                  <p className="text-white/80 text-sm">{s.label}</p>
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

          {/* Packages (live from admin -> Sponsors) */}
          {packages && packages.length > 0 && (
          <motion.div id="tiers" className="scroll-mt-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-display text-white text-3xl text-center mb-2">SPONSORSHIP TIERS</h2>
            <p className="text-white/70 text-sm text-center mb-8">Priced per event. Ohio covers all three Ohio events: Cleveland, Cincinnati and Columbus.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {packages.map((pkg, i) => {
                const color = ACCENTS[i % ACCENTS.length];
                const options = sponsorEventOptions(pkg.per_city);
                const allSold = options.every(ev => pkg.sold_events.includes(ev.id));
                return (
                  <div key={pkg.id} className="bg-white/[0.03] border rounded-2xl p-6 flex flex-col" style={{ borderColor: `${color}40` }}>
                    <div className="mb-4">
                      <Star size={20} style={{ color }} className="mb-3" />
                      <h3 className="font-display text-white text-xl mb-1">{pkg.name}</h3>
                      <p className="font-bold" style={{ color }}>{money(pkg.price_per_event)} <span className="text-white/60 font-normal text-sm">/ event</span></p>
                      {pkg.blurb && <p className="text-white/70 text-sm mt-1">{pkg.blurb}</p>}
                    </div>
                    <ul className="space-y-2 flex-1">
                      {pkg.features.map((perk, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-white/80">
                          <span style={{ color }} className="mt-0.5 flex-shrink-0">✓</span>
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 pt-4 border-t border-white/10 space-y-1.5">
                      {options.map(ev => {
                        const sold = pkg.sold_events.includes(ev.id);
                        return (
                          <div key={ev.id} className="flex items-center justify-between text-sm">
                            <span className={sold ? "text-white/40 line-through" : "text-white/80"}>{ev.label}</span>
                            {sold
                              ? <span className="text-[10px] font-bold tracking-widest text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5">SOLD</span>
                              : <span className="text-white/70">{money(pkg.price_per_event * ev.events)}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => setReserving(pkg)} disabled={allSold}
                      className="mt-5 w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-white/10 disabled:text-white/40 text-black font-bold tracking-widest text-xs px-4 py-3 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed">
                      {allSold ? "SOLD OUT" : "RESERVE THIS"}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
          )}

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
                  <p className="text-white/80 text-sm leading-relaxed">{item.desc}</p>
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
                <p className="text-white/80">Our partnerships team will be in touch within 48 hours.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Your Name *</label>
                      <input type="text" value={form.name} onChange={set("name")} required placeholder="Your name"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Company *</label>
                      <input type="text" value={form.company} onChange={set("company")} required placeholder="Brand / Company name"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" value={form.email} onChange={set("email")} required placeholder="your@company.com"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                    <div>
                      <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Phone</label>
                      <input type="tel" value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000"
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Package Interest</label>
                    <select value={form.package} onChange={set("package")}
                      className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors text-sm cursor-pointer">
                      <option value="" className="bg-[#0d0500]">Select a tier</option>
                      {(packages || []).map(p => (
                        <option key={p.id} value={p.name} className="bg-[#0d0500]">{p.name} — {money(p.price_per_event)} / event</option>
                      ))}
                      <option value="Not sure yet" className="bg-[#0d0500]">Not sure yet — let&apos;s talk</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Tell Us More</label>
                    <textarea value={form.message} onChange={set("message")} rows={4} placeholder="Which cities? Goals for the sponsorship? Any questions?"
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm resize-none" />
                  </div>
                  
                  <HoneypotField value={hp} onChange={setHp} />
                  <Turnstile
                    onVerify={setCaptchaToken}
                    onError={() => setCaptchaToken("")}
                    onExpire={() => setCaptchaToken("")}
                  />

                  <button type="submit" disabled={loading || !captchaToken}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                    {loading ? "Submitting..." : <><Send size={16} /> REQUEST INFO</>}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      {reserving && <ReserveModal pkg={reserving} onClose={() => setReserving(null)} />}
      <Footer />
    </>
  );
}

// ─── Reserve This ────────────────────────────────────────────────────────────

function ReserveModal({ pkg, onClose }: { pkg: SponsorPackage; onClose: () => void }) {
  const options = sponsorEventOptions(pkg.per_city);
  const available = options.filter(ev => !pkg.sold_events.includes(ev.id));
  const [events, setEvents] = useState<string[]>(available.length === 1 ? [available[0].id] : []);
  const [form, setForm] = useState({ companyName: "", contactName: "", contactEmail: "", contactPhone: "", website: "" });
  const [smsConsent, setSmsConsent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const total = sponsorTotal(pkg.price_per_event, events);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggle = (id: string) => setEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/sponsor-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, packageId: pkg.id, events, smsConsent, captchaToken, [HONEYPOT_FIELD]: hp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setCaptchaToken("");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="bg-[#0d0500] border border-white/15 rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-yellow-400 text-xs uppercase tracking-[3px] font-bold mb-1">Reserve</p>
            <h3 className="text-white font-display text-2xl tracking-wider">{pkg.name.toUpperCase()}</h3>
            <p className="text-white/60 text-xs mt-1">{money(pkg.price_per_event)} per event</p>
          </div>
          <button onClick={() => !loading && onClose()} aria-label="Close" className="text-white/80 hover:text-white cursor-pointer"><X size={22} /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle size={44} className="text-yellow-400 mx-auto mb-3" />
            <p className="font-display text-yellow-400 text-2xl mb-2">REQUEST RECEIVED!</p>
            <p className="text-white/80 text-sm">We emailed a copy to {form.contactEmail}. Our team will review it and send your payment link once approved.</p>
            <button onClick={onClose} className="mt-6 text-white/80 hover:text-white text-sm underline cursor-pointer">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <p className="text-white/80 text-xs uppercase tracking-wider mb-2">Events *</p>
              <div className="space-y-1.5">
                {options.map(ev => {
                  const sold = pkg.sold_events.includes(ev.id);
                  return (
                    <label key={ev.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border ${sold ? "border-white/5 opacity-50 cursor-not-allowed" : "border-white/10 hover:border-white/25 cursor-pointer"}`}>
                      <span className="flex items-center gap-2.5">
                        <input type="checkbox" checked={events.includes(ev.id)} disabled={sold} onChange={() => toggle(ev.id)} className="accent-yellow-500" />
                        <span>
                          <span className="text-white text-sm">{ev.label}</span>
                          {ev.detail && <span className="block text-white/50 text-[11px]">{ev.detail}</span>}
                        </span>
                      </span>
                      <span className="text-white/70 text-sm">{sold ? "SOLD" : money(pkg.price_per_event * ev.events)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-baseline justify-between bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3">
              <span className="text-white/80 text-sm">Total</span>
              <span className="font-display text-2xl text-yellow-400">{money(total)}</span>
            </div>

            <div>
              <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Company Name *</label>
              <input required value={form.companyName} onChange={set("companyName")} placeholder="Your company" className={input} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Contact Name *</label>
                <input required value={form.contactName} onChange={set("contactName")} placeholder="Jane Smith" className={input} />
              </div>
              <div>
                <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Contact Phone *</label>
                <input required type="tel" value={form.contactPhone} onChange={set("contactPhone")} placeholder="(555) 000-0000" className={input} />
              </div>
            </div>
            <div>
              <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Contact Email *</label>
              <input required type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="you@company.com" className={input} />
            </div>
            <div>
              <label className="text-white/80 text-xs uppercase tracking-wider mb-1.5 block">Website</label>
              <input value={form.website} onChange={set("website")} placeholder="yourcompany.com" className={input} />
            </div>

            <label className="flex items-start gap-2.5 text-white/70 text-xs leading-relaxed cursor-pointer">
              <input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} className="accent-yellow-500 mt-0.5" />
              <span>Text me updates about this sponsorship request (approval and payment link). Message and data rates may apply. Reply STOP to opt out.</span>
            </label>

            <HoneypotField value={hp} onChange={setHp} />
            <Turnstile onVerify={setCaptchaToken} onError={() => setCaptchaToken("")} onExpire={() => setCaptchaToken("")} />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit"
              disabled={loading || !captchaToken || events.length === 0 || !form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim() || !form.contactPhone.trim()}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold tracking-widest text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed">
              {loading ? "SUBMITTING…" : "REQUEST TO RESERVE"}
            </button>
            <p className="text-white/50 text-xs text-center">No payment now. We&apos;ll review your request and email you a payment link once approved.</p>
          </form>
        )}
      </div>
    </div>
  );
}
