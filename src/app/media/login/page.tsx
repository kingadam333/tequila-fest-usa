"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function MediaLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/media/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("media_token", data.token);
        localStorage.setItem("media_partner", JSON.stringify(data.partner));
        router.push("/media/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0d0500] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/tequilafest_usa.png" alt="Tequila Fest USA" width={100} height={100} className="w-20 mx-auto drop-shadow-lg mb-4" />
          <p className="text-yellow-500 text-xs font-bold tracking-[0.3em] uppercase">Media Partner Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-4">
          {error && <div className="bg-red-900/30 border border-red-500/40 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
          </div>
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition-colors text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-3.5 rounded-xl transition-all duration-200 cursor-pointer">
            {loading ? "Logging in..." : "LOG IN"}
          </button>
        </form>
      </div>
    </main>
  );
}
