"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // TODO: wire to API
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setError("Invalid email or password. Please try again.");
  };

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500] flex items-center justify-center px-4 py-20">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(245,166,35,0.07) 0%, transparent 60%)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm p-8 md:p-10">

            {/* Logo */}
            <div className="text-center mb-8">
              <Link href="/">
                <Image
                  src="/tequilafest_usa.png"
                  alt="Tequila Fest USA"
                  width={120}
                  height={120}
                  className="w-20 mx-auto drop-shadow-lg mb-4"
                />
              </Link>
              <h1 className="font-display text-white text-4xl leading-none">SIGN IN</h1>
              <p className="text-white/40 text-sm mt-2">Access your tickets & account</p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-6"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Forgot password */}
              <div className="text-right">
                <Link href="/forgot-password" className="text-white/30 hover:text-yellow-400 text-xs transition-colors duration-200">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : "SIGN IN"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/20 text-xs">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Sign up link */}
            <p className="text-center text-white/40 text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors duration-200">
                Create one free
              </Link>
            </p>
          </div>

          {/* Back to site */}
          <p className="text-center mt-6 text-white/20 text-xs">
            <Link href="/" className="hover:text-white/40 transition-colors duration-200">
              ← Back to TequilaFestUSA.com
            </Link>
          </p>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
