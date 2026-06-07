"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Eye, EyeOff } from "lucide-react";

const PERM_LABELS: Record<string, string> = {
  checkin: "Event Check-In",
  orders: "View Orders",
  inbox: "Contact Inbox",
  events: "View Events",
};

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [staffInfo, setStaffInfo] = useState<{ name: string; email: string; permissions: string[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/staff/accept-invite?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setLoadError(d.error);
        else setStaffInfo(d);
      })
      .catch(() => setLoadError("Failed to load invite. Check the link."));
  }, [token]);

  const submit = async () => {
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    const res = await fetch("/api/staff/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) setDone(true);
    else setError(data.error || "Something went wrong");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-display text-yellow-400 text-2xl tracking-widest mb-1">TEQUILA FEST USA</p>
          <p className="text-white/30 text-sm">Staff Account Setup</p>
        </div>

        {loadError ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-semibold mb-2">Invalid Invite</p>
            <p className="text-white/40 text-sm">{loadError}</p>
          </div>
        ) : done ? (
          <div className="bg-green-950/30 border border-green-500/40 rounded-2xl p-8 text-center">
            <CheckCircle size={44} className="text-green-400 mx-auto mb-4" />
            <p className="font-display text-green-400 text-xl mb-2">ACCOUNT READY!</p>
            <p className="text-white/50 text-sm mb-6">Your staff account is active. You can now log in.</p>
            <a href="/checkin"
              className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200">
              GO TO CHECK-IN
            </a>
          </div>
        ) : staffInfo ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <p className="text-white font-bold text-lg">Hi, {staffInfo.name}!</p>
              <p className="text-white/40 text-sm">{staffInfo.email}</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
              <p className="text-yellow-400/60 text-xs uppercase tracking-wider mb-2">Your Access</p>
              <div className="flex flex-wrap gap-2">
                {staffInfo.permissions.map((p: string) => (
                  <span key={p} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-lg font-medium">
                    {PERM_LABELS[p] || p}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-white/50 text-sm font-semibold">Set your password</p>

              {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-2">{error}</p>
              )}

              <div>
                <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/20 outline-none text-sm"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  placeholder="Re-enter password"
                  className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none text-sm"
                />
              </div>

              <button onClick={submit} disabled={loading || !password || !confirm}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-all duration-200 cursor-pointer">
                {loading ? "Creating Account..." : "CREATE MY ACCOUNT"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/30 text-sm mt-4">Loading invite...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
