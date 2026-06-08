"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";
import Turnstile from "@/components/Turnstile";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!captchaToken) {
      setError("Please complete the verification challenge.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.noAccount && data.hasTickets) {
          setNoAccount(true);
        } else {
          setSubmitted(true);
        }
      } else {
        setError("Something went wrong. Please try again.");
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
      <div className="sticky top-0 z-50"><OfficialBanner /><Navbar /></div>
      <main className="min-h-screen bg-[#0d0500] flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(245,166,35,0.07) 0%, transparent 60%)" }} />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 md:p-10">
            <div className="text-center mb-8">
              <Link href="/"><Image src="/tequilafest_usa.png" alt="Tequila Fest USA" width={120} height={120} className="w-20 mx-auto drop-shadow-lg mb-4" /></Link>
              <h1 className="font-display text-white text-4xl leading-none">FORGOT PASSWORD</h1>
              <p className="text-white/40 text-sm mt-2">We&apos;ll send you a reset link</p>
            </div>

            {noAccount ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <p className="text-4xl mb-4">🎟️</p>
                <p className="font-display text-yellow-400 text-2xl mb-2">SET UP YOUR ACCOUNT</p>
                <p className="text-white/50 text-sm mb-4">
                  We found tickets purchased with <span className="text-white">{email}</span>, but no account has been created yet.
                </p>
                <p className="text-white/40 text-sm mb-6">
                  Create your free account using this same email address and your tickets, points, and order history will automatically appear in your dashboard.
                </p>
                <Link href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-all mb-4 w-full">
                  CREATE MY ACCOUNT
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
                  <ArrowLeft size={13} /> Back to Log In
                </Link>
              </motion.div>
            ) : submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <p className="text-4xl mb-4">📬</p>
                <p className="font-display text-yellow-400 text-2xl mb-2">CHECK YOUR EMAIL</p>
                <p className="text-white/50 text-sm mb-6">If an account exists for <span className="text-white">{email}</span>, you&apos;ll receive a reset link shortly.</p>
                <Link href="/login" className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-colors">
                  <ArrowLeft size={14} /> Back to Log In
                </Link>
              </motion.div>
            ) : (
              <>
                {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" required
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-white/30 outline-none transition-colors text-sm" />
                  </div>
                  <Turnstile
                    onVerify={setCaptchaToken}
                    onError={() => setCaptchaToken("")}
                    onExpire={() => setCaptchaToken("")}
                  />

                  <button type="submit" disabled={loading || !captchaToken}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all hover:scale-[1.02] cursor-pointer">
                    {loading ? "Sending..." : "SEND RESET LINK"}
                  </button>
                </form>
                <div className="text-center mt-6">
                  <Link href="/login" className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
                    <ArrowLeft size={13} /> Back to Log In
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
