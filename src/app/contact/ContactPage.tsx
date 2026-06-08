"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Send, ChevronDown } from "lucide-react";

import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

const SUBJECTS = [
  "General Inquiry",
  "Ticket Support",
  "Sponsorship Opportunity",
  "Vendor Application",
  "Press / Media",
  "Affiliate Program",
  "Other",
];

const CONTACT_CARDS = [
  {
    icon: <Mail size={20} />,
    label: "Email",
    value: "help@tequilafestusa.com",
    href: "mailto:help@mail.tequilafestusa.com",
    color: "#F5A623",
  },
  {
    icon: <span className="text-base font-black">IG</span>,
    label: "Instagram",
    value: "@tequilafestusa",
    href: "https://instagram.com/tequilafestusa",
    color: "#C8102E",
  },
  {
    icon: <span className="text-base font-black">f</span>,
    label: "Facebook",
    value: "@tequilafestcleveland",
    href: "https://facebook.com/tequilafestcleveland",
    color: "#1877F2",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
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
        body: JSON.stringify({ ...form, captchaToken: "bypass" }),
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
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(245,166,35,0.07) 0%, transparent 55%)" }}
        />

        {/* Hero */}
        <section className="relative pt-20 pb-16 px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Get In Touch</p>
            <h1 className="font-display leading-none" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">CONTACT</span>{" "}
              <span className="text-shimmer-blue">US</span>
            </h1>
            <p className="text-white/50 mt-4 max-w-xl mx-auto">
              Questions about tickets, sponsorships, vendors, or press? We&apos;d love to hear from you.
            </p>
          </motion.div>
        </section>

        <div className="max-w-6xl mx-auto px-4 pb-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Left — form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-3"
            >
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-12 text-center"
                >
                  <p className="text-5xl mb-4">🥃</p>
                  <p className="font-display text-yellow-400 text-3xl mb-2">MESSAGE SENT!</p>
                  <p className="text-white/50 mb-6">We&apos;ll get back to you within 1–2 business days.</p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}
                    className="text-yellow-400 border border-yellow-500/30 px-6 py-2.5 rounded-xl hover:border-yellow-500/60 transition-all duration-200 text-sm font-semibold cursor-pointer"
                  >
                    Send Another
                  </button>
                </motion.div>
              ) : (
                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8">
                  <h2 className="font-display text-white text-2xl mb-6">SEND A MESSAGE</h2>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Name *</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={set("name")}
                          placeholder="Your name"
                          required
                          className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email *</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={set("email")}
                          placeholder="your@email.com"
                          required
                          className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                        />
                      </div>
                    </div>

                    {/* Phone + Subject */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Phone <span className="text-white/20 normal-case">(optional)</span></label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={set("phone")}
                          placeholder="(555) 000-0000"
                          className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Subject *</label>
                        <div className="relative">
                          <select
                            value={form.subject}
                            onChange={set("subject")}
                            required
                            className="w-full appearance-none bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white outline-none transition-colors duration-200 text-sm cursor-pointer"
                          >
                            <option value="" disabled className="bg-[#0d0500]">Select a topic</option>
                            {SUBJECTS.map(s => (
                              <option key={s} value={s} className="bg-[#0d0500]">{s}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Message *</label>
                      <textarea
                        value={form.message}
                        onChange={set("message")}
                        placeholder="Tell us how we can help..."
                        required
                        rows={5}
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm resize-none"
                      />
                    </div>

                    

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <><Send size={16} /> SEND MESSAGE</>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>

            {/* Right — contact info + quick links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Contact cards */}
              <div>
                <h2 className="font-display text-white text-2xl mb-4">REACH US DIRECTLY</h2>
                <div className="space-y-3">
                  {CONTACT_CARDS.map(card => (
                    <a key={card.label} href={card.href} target={card.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-2xl px-5 py-4 transition-all duration-200 group"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={{ background: `${card.color}18`, color: card.color, border: `1px solid ${card.color}30` }}>
                        {card.icon}
                      </div>
                      <div>
                        <p className="text-white/30 text-xs uppercase tracking-wider">{card.label}</p>
                        <p className="text-white/80 group-hover:text-white font-medium text-sm transition-colors duration-200">{card.value}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Response time */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4">
                <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Response Time</p>
                <p className="text-white/70 text-sm">We typically respond within <span className="text-yellow-400 font-semibold">1–2 business days</span>. For urgent ticket issues, email is fastest.</p>
              </div>

              {/* Quick links */}
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Quick Links</p>
                <div className="space-y-2">
                  {[
                    { label: "Affiliate Program", href: "/affiliates", desc: "Earn commission promoting events" },
                    { label: "Sponsorship Packages", href: "/sponsors", desc: "Brand partnerships & sponsorships" },
                    { label: "Vendor Application", href: "/vendors", desc: "Sell at our festivals" },
                    { label: "Press & Media Kit", href: "/press", desc: "Assets, bios & press releases" },
                  ].map(link => (
                    <Link key={link.label} href={link.href}
                      className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/15 rounded-xl px-4 py-3 transition-all duration-200 group"
                    >
                      <div>
                        <p className="text-white/70 group-hover:text-yellow-400 text-sm font-medium transition-colors duration-200">{link.label}</p>
                        <p className="text-white/25 text-xs">{link.desc}</p>
                      </div>
                      <span className="text-white/20 group-hover:text-yellow-400 transition-colors duration-200">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
