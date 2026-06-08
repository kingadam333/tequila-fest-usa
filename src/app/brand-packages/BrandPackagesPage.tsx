"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Users, Globe2, TrendingUp, DollarSign, Send, Trophy } from "lucide-react";

import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Turnstile from "@/components/Turnstile";

type City = { id: string; label: string };
type Pkg = {
  name: string;
  pricePerCity: number;
  blurb: string;
  features: string[];
  soldCityIds?: string[]; // cities where this package is sold out
};

const CITIES: City[] = [
  { id: "cleveland",  label: "Cleveland, OH" },
  { id: "cincinnati", label: "Cincinnati, OH" },
  { id: "columbus",   label: "Columbus, OH" },
  { id: "phoenix",    label: "Phoenix, AZ" },
];

const BRAND_PACKAGES: Pkg[] = [
  {
    name: "Value",
    pricePerCity: 250,
    blurb: "For brands with average retail bottle price of $25 or less",
    features: ["10x10 Area", "Tent & Table", "Staff Member to Pour", "1 Social Post per Week", "Listing on Website"],
  },
  {
    name: "Standard",
    pricePerCity: 300,
    blurb: "For brands with average retail bottle price of $25 to $45",
    features: ["10x10 Area", "Tent & Table", "Staff Member to Pour", "1 Social Post per Week", "Listing on Website"],
  },
  {
    name: "Premium",
    pricePerCity: 350,
    blurb: "For brands with average retail bottle price of $45 or more",
    features: ["10x10 Area", "Tent & Table", "Staff Member to Pour", "1 Social Post per Week", "Listing on Website"],
  },
];

const PARTNER_PACKAGES: Pkg[] = [
  {
    name: "Official Tequila",
    pricePerCity: 3000,
    blurb: "Title beverage partner",
    features: ["5 Case Commitment", "Logo on koozies", "10 Tickets w/ Samples & Food", "2 Posts per Week on Social"],
    soldCityIds: ["cleveland", "cincinnati", "columbus"],
  },
  {
    name: "VIP Sponsor",
    pricePerCity: 1500,
    blurb: "Premium VIP placement",
    features: ["Exclusive Table in VIP", "Logo on Flasks", "2 VIP Tickets for Guests", "1 Post per Week on Social"],
  },
  {
    name: "Official Beer",
    pricePerCity: 1500,
    blurb: "Title beer partner",
    features: ["10 Case Commitment", "Signage Around Venue", "4 Tickets w/ Samples and Food", "1 Post per Week on Social"],
  },
  {
    name: "Official RTD",
    pricePerCity: 1000,
    blurb: "Ready-to-drink partner",
    features: ["5 Case Commitment", "Signage Around Venue", "4 Tickets w/ Sampling & Food", "1 Post per Week on Social"],
  },
];

const WHY = [
  { icon: <Users size={22} />,      title: "Massive Event Reach",   body: "Our events draw 1,500+ attendees per city and tens of thousands viewing online." },
  { icon: <Globe2 size={22} />,     title: "Brand Visibility",      body: "Get featured on our website, social media, and at every event with prominent branding." },
  { icon: <TrendingUp size={22} />, title: "Growth Opportunities",  body: "Put your product directly into consumers' mouths — no better way to gain new followers." },
  { icon: <DollarSign size={22} />, title: "Sales Generation",      body: "We buy all the product from you, and consumers will continue buying your bottles at the store." },
];

// ─── Package card with city picker + running total ────────────────────────────

function PackageCard({ pkg, index, onSelect, accent = "#F5A623" }: { pkg: Pkg; index: number; onSelect: (pkgName: string, cities: string[], total: number) => void; accent?: string; }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const sold = pkg.soldCityIds || [];
  const toggle = (id: string) => {
    if (sold.includes(id)) return;
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const total = useMemo(() => picked.size * pkg.pricePerCity, [picked, pkg.pricePerCity]);

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * index }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col">
      <div>
        <p className="text-white font-bold text-xl">{pkg.name}</p>
        <p className="font-display text-4xl text-white mt-1">
          ${pkg.pricePerCity.toLocaleString()}
          <span className="text-white/40 text-base font-sans font-normal"> / city</span>
        </p>
        <p className="text-white/50 text-sm mt-2">{pkg.blurb}</p>
      </div>

      <div className="mt-5 pt-5 border-t border-white/10">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Package Includes</p>
        <ul className="space-y-2">
          {pkg.features.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/75">
              <Check size={15} className="flex-shrink-0 mt-0.5" style={{ color: accent }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 pt-5 border-t border-white/10">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Select Cities</p>
        <div className="space-y-1.5">
          {CITIES.map(c => {
            const isSold = sold.includes(c.id);
            const isChecked = picked.has(c.id);
            return (
              <label key={c.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border transition-all ${isSold ? "border-yellow-500/20 bg-yellow-500/5 cursor-not-allowed" : "border-white/5 hover:border-white/15 cursor-pointer"}`}>
                <div className="flex items-center gap-2.5">
                  <input type="checkbox" checked={isChecked} disabled={isSold} onChange={() => toggle(c.id)}
                    className="accent-yellow-500 disabled:opacity-30" />
                  {isSold ? (
                    <span className="text-yellow-400/60 line-through text-sm flex items-center gap-1.5">
                      <Trophy size={13} /> {c.label}
                    </span>
                  ) : (
                    <span className="text-white/80 text-sm">{c.label}</span>
                  )}
                </div>
                {isSold && <span className="text-[10px] font-bold tracking-widest text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5">SOLD</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-sm">{picked.size} {picked.size === 1 ? "city" : "cities"}</p>
          <p className="font-display text-2xl" style={{ color: accent }}>${total.toLocaleString()}</p>
        </div>
        <button onClick={() => onSelect(pkg.name, [...picked], total)} disabled={picked.size === 0}
          className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-yellow-500 text-black font-bold tracking-widest text-xs px-4 py-3 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed">
          REQUEST CITIES
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandPackagesPage() {
  const [form, setForm] = useState({ name: "", email: "", brand: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const onPackagePick = (pkgName: string, cities: string[], total: number) => {
    const cityLabels = cities.map(id => CITIES.find(c => c.id === id)?.label).filter(Boolean).join(", ");
    setForm(f => ({
      ...f,
      message: `${f.message ? f.message + "\n\n" : ""}Interested in ${pkgName} — ${cityLabels} (~$${total.toLocaleString()})`,
    }));
    if (typeof window !== "undefined") {
      document.getElementById("inquire")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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

        {/* ─── HERO ─── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-yellow-400 text-xs uppercase tracking-[4px] font-bold mb-4">Brand Packages</p>
            <h1 className="font-display text-white text-4xl sm:text-5xl lg:text-6xl tracking-wider mb-5">
              GROW YOUR BRAND WITH US
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
              Partner with Tequila Fest USA and reach <span className="text-yellow-400 font-semibold">thousands of tequila enthusiasts</span> across the nation.
            </p>
          </motion.div>
        </section>

        {/* ─── WHY PARTNER ─── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <div className="text-center mb-10">
            <h2 className="font-display text-white text-3xl sm:text-4xl tracking-wider mb-3">WHY PARTNER WITH US?</h2>
            <p className="text-white/50 text-sm">Join the premier tequila festival experience in the Midwest and Southwest.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHY.map((w, i) => (
              <motion.div key={w.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">{w.icon}</div>
                <p className="text-white font-bold mb-1.5">{w.title}</p>
                <p className="text-white/55 text-sm leading-relaxed">{w.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── TEQUILA BRAND PACKAGES ─── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-10">
            <h2 className="font-display text-white text-3xl sm:text-4xl tracking-wider mb-3">TEQUILA BRAND PACKAGES</h2>
            <p className="text-white/50 text-sm max-w-2xl mx-auto">
              Choose your package tier based on your tequila's price point and select the cities you want to participate in.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BRAND_PACKAGES.map((p, i) => (
              <PackageCard key={p.name} pkg={p} index={i} onSelect={onPackagePick} accent="#F5A623" />
            ))}
          </div>
        </section>

        {/* ─── BECOME A PARTNER ─── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-10">
            <h2 className="font-display text-white text-3xl sm:text-4xl tracking-wider mb-3">BECOME A PARTNER</h2>
            <p className="text-white/50 text-sm">Exclusive sponsorship opportunities for beverage brands.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PARTNER_PACKAGES.map((p, i) => (
              <PackageCard key={p.name} pkg={p} index={i} onSelect={onPackagePick} accent="#C8102E" />
            ))}
          </div>
        </section>

        {/* ─── INQUIRE FORM ─── */}
        <section id="inquire" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <div className="text-center mb-10">
            <h2 className="font-display text-white text-3xl sm:text-4xl tracking-wider mb-3">GET IN TOUCH</h2>
            <p className="text-white/50 text-sm">Tell us about your brand. We'll follow up within 1–2 business days.</p>
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
                  <textarea required rows={5} value={form.message} onChange={set("message")} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-yellow-500/50 placeholder-white/30 resize-y" placeholder="Distribution, target cities, package interest, anything else…" />
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
