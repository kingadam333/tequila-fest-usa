"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Lock, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setValidating(false); return; }
    fetch(`/api/auth/forgot-password?token=${token}`)
      .then(r => r.json())
      .then(d => { setTokenValid(d.valid); setValidating(false); })
      .catch(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) setSuccess(true);
      else { const d = await res.json(); setError(d.error || "Something went wrong."); }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  if (validating) return <div className="text-center text-white/40 py-10">Validating link...</div>;

  if (!token || !tokenValid) return (
    <div className="text-center py-4">
      <p className="text-4xl mb-4">⚠️</p>
      <p className="font-display text-white text-2xl mb-2">INVALID LINK</p>
      <p className="text-white/50 text-sm mb-6">This reset link has expired or is invalid.</p>
      <Link href="/forgot-password" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-all">Request New Link</Link>
    </div>
  );

  if (success) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
      <p className="text-4xl mb-4">✅</p>
      <p className="font-display text-yellow-400 text-2xl mb-2">PASSWORD UPDATED</p>
      <p className="text-white/50 text-sm mb-6">Your password has been reset successfully.</p>
      <Link href="/login" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-all">Log In</Link>
    </motion.div>
  );

  return (
    <>
      {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (8+ characters)" required
            className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-10 pr-11 py-3.5 text-white placeholder-white/30 outline-none transition-colors text-sm" />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <div className="relative">
          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" required
            className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/30 outline-none transition-colors text-sm" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all hover:scale-[1.02] cursor-pointer">
          {loading ? "Updating..." : "SET NEW PASSWORD"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <div className="sticky top-0 z-50"><OfficialBanner /><Navbar /></div>
      <main className="min-h-screen bg-[#0d0500] flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(245,166,35,0.07) 0%, transparent 60%)" }} />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 md:p-10">
            <div className="text-center mb-8">
              <Link href="/"><Image src="/tequilafest_usa.png" alt="Tequila Fest USA" width={120} height={120} className="w-20 mx-auto drop-shadow-lg mb-4" /></Link>
              <h1 className="font-display text-white text-4xl leading-none">RESET PASSWORD</h1>
              <p className="text-white/40 text-sm mt-2">Choose a new password for your account</p>
            </div>
            <Suspense fallback={<div className="text-center text-white/40 py-10">Loading...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
