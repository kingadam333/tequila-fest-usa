"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Mail, Phone, ArrowRight, Loader2 } from "lucide-react";
import Turnstile from "@/components/Turnstile";

interface Props {
  eventSlug: string;
  eventCity: string;
  ticketType: string;
  ticketLabel: string;
  price: number;
  quantity: number;
  color: string;
  onClose: () => void;
}

export default function PreCheckoutModal({
  eventSlug, eventCity, ticketType, ticketLabel, price, quantity, color, onClose,
}: Props) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) return;
    if (!captchaToken) {
      setError("Please complete the verification challenge.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/pre-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          eventSlug,
          ticketType,
          quantity,
          captchaToken,
          refCode: typeof window !== "undefined" ? localStorage.getItem(`ref_${eventSlug}`) || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setCaptchaToken("");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setCaptchaToken("");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-md bg-[#0d0500] border border-white/15 rounded-3xl p-6 shadow-2xl"
          style={{ boxShadow: `0 0 60px ${color}20` }}
        >
          <button onClick={onClose}
            className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors cursor-pointer">
            <X size={18} />
          </button>

          {/* Header */}
          <div className="mb-6">
            <p className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase mb-1">Almost there</p>
            <h2 className="font-display text-white text-3xl leading-none">YOUR INFO</h2>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold"
              style={{ background: `${color}15`, borderColor: `${color}40`, color }}>
              {ticketLabel} × {quantity} — ${price * quantity}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name row */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" value={form.firstName} onChange={set("firstName")}
                  placeholder="First name" required autoFocus
                  className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-9 pr-3 py-3 text-white placeholder-white/25 text-sm outline-none transition-colors" />
              </div>
              <div className="flex-1">
                <input type="text" value={form.lastName} onChange={set("lastName")}
                  placeholder="Last name" required
                  className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none transition-colors" />
              </div>
            </div>

            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="email" value={form.email} onChange={set("email")}
                placeholder="Email address" required
                className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm outline-none transition-colors" />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="tel" value={form.phone} onChange={set("phone")}
                placeholder="Phone number (optional)"
                className="w-full bg-white/5 border border-yellow-500/15 focus:border-yellow-500/40 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm outline-none transition-colors" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-500/50 text-xs font-semibold hidden sm:block">⚡ Flash Deals</span>
            </div>

            <Turnstile
              onVerify={setCaptchaToken}
              onError={() => setCaptchaToken("")}
              onExpire={() => setCaptchaToken("")}
            />

            <button type="submit" disabled={loading || !captchaToken}
              className="w-full flex items-center justify-center gap-2 font-bold text-lg py-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              style={{ background: color, color: "#0d0500" }}>
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Redirecting to checkout...</>
              ) : (
                <>Continue to Payment <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="text-white/20 text-xs text-center mt-4">
            By continuing you agree to our Terms of Service. Must be 21+.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
