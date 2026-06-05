"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

export default function SignupPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    // TODO: wire to API
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSuccess(true);
  };

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500] flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(245,166,35,0.07) 0%, transparent 60%)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
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
              <h1 className="font-display text-white text-4xl leading-none">CREATE ACCOUNT</h1>
              <p className="text-white/40 text-sm mt-2">Get tickets, track orders & more</p>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <p className="text-5xl mb-4">🥃</p>
                <p className="font-display text-yellow-400 text-3xl mb-2">YOU&apos;RE IN!</p>
                <p className="text-white/50 text-sm mb-6">Welcome to Tequila Fest USA. Check your email to verify your account.</p>
                <Link href="/login"
                  className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl transition-all duration-200">
                  Log In
                </Link>
              </motion.div>
            ) : (
              <>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3 mb-6"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Name row */}
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={set("firstName")}
                        placeholder="First name"
                        required
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-10 pr-3 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                      />
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={set("lastName")}
                        placeholder="Last name"
                        required
                        className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="Email address"
                      required
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="Phone number (optional)"
                      className="w-full bg-white/5 border border-yellow-500/15 focus:border-yellow-500/40 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-yellow-500/50 text-xs font-semibold hidden sm:block">⚡ Flash Deals</span>
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      placeholder="Password (8+ characters)"
                      required
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-10 pr-11 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Confirm password */}
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={form.confirm}
                      onChange={set("confirm")}
                      placeholder="Confirm password"
                      required
                      className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl pl-10 pr-11 py-3.5 text-white placeholder-white/30 outline-none transition-colors duration-200 text-sm"
                    />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Terms */}
                  <p className="text-white/25 text-xs pt-1">
                    By creating an account you agree to our{" "}
                    <Link href="/terms" className="text-white/40 hover:text-yellow-400 transition-colors">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-white/40 hover:text-yellow-400 transition-colors">Privacy Policy</Link>.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold text-base py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer mt-1"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Creating account...
                      </span>
                    ) : "CREATE ACCOUNT"}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/20 text-xs">OR</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <p className="text-center text-white/40 text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors duration-200">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>

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
