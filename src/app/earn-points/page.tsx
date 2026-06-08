"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Upload, Camera, Video, Share2, Ticket, Star, ChevronDown, Check, X, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

const EVENTS = [
  { id: "cincinnati", label: "Cincinnati — June 13, 2026", color: "#F5A623" },
  { id: "cleveland", label: "Cleveland — July 25, 2026", color: "#C8102E" },
  { id: "columbus", label: "Columbus — August 8, 2026", color: "#00A878" },
  { id: "phoenix", label: "Phoenix — November 14, 2026", color: "#7B2FBE" },
];

const POINT_ACTIONS = [
  { icon: <Ticket size={20} />, label: "Buy a Ticket", points: 100, desc: "Automatically awarded on purchase", color: "#F5A623" },
  { icon: <Camera size={20} />, label: "Upload a Photo", points: 10, desc: "From any Tequila Fest event", color: "#00A878" },
  { icon: <Video size={20} />, label: "Upload a Video", points: 20, desc: "Reels, TikToks, clips from the event", color: "#C8102E" },
  { icon: <Share2 size={20} />, label: "Social Share", points: 50, desc: "Post on Instagram, TikTok, or Facebook", color: "#7B2FBE" },
];

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "IG" },
  { id: "tiktok", label: "TikTok", icon: "TT" },
  { id: "facebook", label: "Facebook", icon: "FB" },
];

interface LeaderboardEntry { rank: number; name: string; points: number; }

export default function EarnPointsPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "social">("upload");
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [caption, setCaption] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ points: number; message: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Social claim state
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialUrl, setSocialUrl] = useState("");
  const [socialEvent, setSocialEvent] = useState("");
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const [socialResult, setSocialResult] = useState<{ pending: boolean } | null>(null);
  const [socialError, setSocialError] = useState("");

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  useEffect(() => {
    fetch("/api/leaderboard").then(r => r.json()).then(d => setLeaderboard(d.leaderboard || []));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File too large. Maximum 50MB.");
      return;
    }

    setFileName(file.name);
    setUploadError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setFileData(data);
      setPreview(data);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileData || !selectedEvent || !termsAccepted) return;
    setUploading(true);
    setUploadError("");
    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData, fileName, mediaType, eventId: selectedEvent, caption, termsAccepted }),
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({ points: data.pointsAwarded, message: data.message });
        setFileData(null); setPreview(null); setFileName(""); setCaption(""); setTermsAccepted(false);
      } else {
        setUploadError(data.error || "Upload failed. Please try again.");
      }
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSocialClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialUrl || !socialEvent) return;
    setSocialSubmitting(true);
    setSocialError("");
    try {
      const res = await fetch("/api/social-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: socialPlatform, postUrl: socialUrl, eventId: socialEvent }),
      });
      const data = await res.json();
      if (res.ok) {
        setSocialResult({ pending: true });
        setSocialUrl(""); setSocialEvent("");
      } else {
        setSocialError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setSocialError("Network error. Please try again.");
    } finally {
      setSocialSubmitting(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50"><OfficialBanner /><Navbar /></div>

      <main className="min-h-screen bg-[#0d0500]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(0,168,120,0.08) 0%, transparent 55%)" }} />

        {/* Hero */}
        <section className="pt-16 pb-12 px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">Tequila Fest Rewards</p>
            <h1 className="font-display leading-none mb-4" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">EARN</span>{" "}
              <span className="text-white">POINTS</span>
            </h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Share your Tequila Fest experience and earn points redeemable for gear, VIP upgrades, and free tickets.
            </p>
          </motion.div>
        </section>

        <div className="max-w-5xl mx-auto px-4 pb-24 relative">

          {/* How to earn */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mb-4">How to Earn</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {POINT_ACTIONS.map(action => (
                <div key={action.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center">
                  <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-3"
                    style={{ background: `${action.color}20`, color: action.color }}>
                    {action.icon}
                  </div>
                  <p className="font-display text-white text-lg leading-none">{action.label}</p>
                  <p className="font-display mt-1 mb-1" style={{ fontSize: "2rem", color: action.color }}>{action.points}</p>
                  <p className="text-yellow-500/60 text-xs font-bold uppercase tracking-wider mb-1">pts</p>
                  <p className="text-white/30 text-xs">{action.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tab selector */}
          <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-2xl p-1 mb-8 w-fit">
            {([["upload", "Upload Media"], ["social", "Social Share"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === id ? "bg-yellow-500 text-black" : "text-white/40 hover:text-white"}`}>
                {id === "upload" ? <Upload size={15} /> : <Share2 size={15} />}
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* Upload tab */}
            {activeTab === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {uploadResult ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-500/10 border border-green-500/30 rounded-2xl p-10 text-center max-w-lg mx-auto">
                    <p className="text-5xl mb-4">🎉</p>
                    <p className="font-display text-green-400 text-3xl mb-2">+{uploadResult.points} POINTS</p>
                    <p className="text-white/60 mb-6">{uploadResult.message}</p>
                    <button onClick={() => setUploadResult(null)}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-all cursor-pointer">
                      Upload Another
                    </button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: file picker */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                      <h3 className="text-white font-bold mb-4">Upload Your Content</h3>

                      {/* Photo / Video toggle */}
                      <div className="flex gap-2 mb-5">
                        {(["photo", "video"] as const).map(type => (
                          <button key={type} onClick={() => { setMediaType(type); setFileData(null); setPreview(null); setFileName(""); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer capitalize ${mediaType === type ? "bg-yellow-500 text-black" : "bg-white/5 border border-white/15 text-white/50 hover:text-white"}`}>
                            {type === "photo" ? <Camera size={15} /> : <Video size={15} />}
                            {type} <span className="text-xs opacity-70">({type === "photo" ? "+10" : "+20"} pts)</span>
                          </button>
                        ))}
                      </div>

                      {/* Drop zone */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/15 hover:border-yellow-500/40 rounded-2xl p-8 text-center cursor-pointer transition-all mb-4 relative overflow-hidden"
                      >
                        {preview ? (
                          <div className="relative">
                            {mediaType === "photo" ? (
                              <Image src={preview} alt="Preview" width={400} height={300} className="max-h-48 mx-auto rounded-xl object-cover" />
                            ) : (
                              <video src={preview} className="max-h-48 mx-auto rounded-xl" controls />
                            )}
                            <button onClick={e => { e.stopPropagation(); setPreview(null); setFileData(null); setFileName(""); }}
                              className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white/60 hover:text-white cursor-pointer">
                              <X size={14} />
                            </button>
                            <p className="text-white/50 text-xs mt-2 truncate">{fileName}</p>
                          </div>
                        ) : (
                          <>
                            <Upload size={32} className="mx-auto mb-3 text-white/20" />
                            <p className="text-white/50 text-sm">Click to select a {mediaType}</p>
                            <p className="text-white/20 text-xs mt-1">JPG, PNG, MP4, MOV · Max 50MB</p>
                          </>
                        )}
                        <input ref={fileInputRef} type="file" className="hidden"
                          accept={mediaType === "photo" ? "image/*" : "video/*"}
                          onChange={handleFileSelect} />
                      </div>

                      {uploadError && <p className="text-red-400 text-sm mb-3">{uploadError}</p>}

                      {/* Caption */}
                      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2}
                        placeholder="Add a caption (optional)"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none resize-none mb-4" />

                      {/* Terms */}
                      <label className="flex items-start gap-3 cursor-pointer mb-4">
                        <div onClick={() => setTermsAccepted(v => !v)}
                          className={`w-5 h-5 rounded-md border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${termsAccepted ? "bg-yellow-500 border-yellow-500" : "border-white/30"}`}>
                          {termsAccepted && <Check size={12} className="text-black" />}
                        </div>
                        <span className="text-white/40 text-xs leading-relaxed">
                          I confirm I took this content at a Tequila Fest USA event and grant permission for it to be used in marketing materials.
                        </span>
                      </label>
                    </div>

                    {/* Right: event + submit */}
                    <div className="space-y-4">
                      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-4">Which event is this from?</h3>
                        <div className="space-y-2">
                          {EVENTS.map(ev => (
                            <button key={ev.id} onClick={() => setSelectedEvent(ev.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${selectedEvent === ev.id ? "border-yellow-500/50 bg-yellow-500/10" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}>
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                              <span className="text-white/80 text-sm">{ev.label}</span>
                              {selectedEvent === ev.id && <Check size={14} className="ml-auto text-yellow-400" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Points preview */}
                      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
                        <p className="text-white/30 text-xs uppercase tracking-wider mb-1">You&apos;ll earn</p>
                        <p className="font-display text-yellow-400" style={{ fontSize: "4rem" }}>
                          {mediaType === "photo" ? 10 : 20}
                        </p>
                        <p className="text-yellow-500/60 text-sm font-bold uppercase tracking-wider">points</p>
                      </div>

                      <button
                        onClick={handleUpload}
                        disabled={!fileData || !selectedEvent || !termsAccepted || uploading}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg py-4 rounded-2xl transition-all cursor-pointer"
                      >
                        {uploading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                            Uploading...
                          </span>
                        ) : `UPLOAD & EARN ${mediaType === "photo" ? 10 : 20} POINTS`}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Social share tab */}
            {activeTab === "social" && (
              <motion.div key="social" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {socialResult ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-10 text-center max-w-lg mx-auto">
                    <p className="text-5xl mb-4">📱</p>
                    <p className="font-display text-purple-400 text-3xl mb-2">SUBMITTED!</p>
                    <p className="text-white/60 mb-2">Thanks for sharing! Your claim is under review.</p>
                    <p className="text-white/30 text-sm mb-6">50 points will be awarded after verification (usually within 24 hours).</p>
                    <button onClick={() => setSocialResult(null)}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-all cursor-pointer">
                      Submit Another
                    </button>
                  </motion.div>
                ) : (
                  <div className="max-w-lg">
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-5">
                      <h3 className="text-white font-bold mb-1">How it works</h3>
                      <ol className="space-y-2 mt-3">
                        {["Post about Tequila Fest on Instagram, TikTok, or Facebook", "Tag @tequilafestusa and use #TequilaFestUSA", "Paste your post URL below", "Earn 50 points after verification"].map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-white/60 text-sm">
                            <span className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <form onSubmit={handleSocialClaim} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                      {/* Platform */}
                      <div>
                        <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Platform</label>
                        <div className="flex gap-2">
                          {SOCIAL_PLATFORMS.map(p => (
                            <button key={p.id} type="button" onClick={() => setSocialPlatform(p.id)}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${socialPlatform === p.id ? "bg-yellow-500 text-black" : "bg-white/5 border border-white/15 text-white/50 hover:text-white"}`}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Event */}
                      <div>
                        <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Event</label>
                        <select value={socialEvent} onChange={e => setSocialEvent(e.target.value)} required
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer appearance-none">
                          <option value="" disabled className="bg-[#0d0500]">Select event</option>
                          {EVENTS.map(ev => <option key={ev.id} value={ev.id} className="bg-[#0d0500]">{ev.label}</option>)}
                        </select>
                      </div>

                      {/* Post URL */}
                      <div>
                        <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Post URL</label>
                        <input type="url" value={socialUrl} onChange={e => setSocialUrl(e.target.value)}
                          placeholder="https://instagram.com/p/..." required
                          className="w-full bg-white/5 border border-white/15 focus:border-yellow-500/50 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none" />
                      </div>

                      {socialError && <p className="text-red-400 text-sm">{socialError}</p>}
                      <button type="submit" disabled={socialSubmitting}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-base py-4 rounded-xl transition-all cursor-pointer">
                        {socialSubmitting ? "Submitting..." : "CLAIM 50 POINTS"}
                      </button>
                    </form>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mb-1">Top Fans</p>
                <h2 className="font-display text-white text-3xl flex items-center gap-3">
                  <Trophy size={28} className="text-yellow-400" /> LEADERBOARD
                </h2>
              </div>
              <Link href="/account" className="text-yellow-400 text-sm hover:text-yellow-300 transition-colors font-semibold">
                My Points →
              </Link>
            </div>
            {leaderboard.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-10 text-center">
                <p className="text-white/30 text-sm">Be the first on the leaderboard — buy a ticket and earn points!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const isTop3 = i < 3;
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }} viewport={{ once: true }}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${
                        isTop3
                          ? "bg-yellow-500/5 border-yellow-500/20"
                          : "bg-white/[0.02] border-white/8"
                      }`}>
                      <span className="w-8 text-center font-display text-xl flex-shrink-0">
                        {medals[i] || <span className="text-white/30 text-sm font-bold">#{entry.rank}</span>}
                      </span>
                      <span className={`flex-1 font-semibold ${isTop3 ? "text-white" : "text-white/70"}`}>
                        {entry.name}
                      </span>
                      <span className="font-display text-xl" style={{ color: isTop3 ? "#F5A623" : "rgba(255,255,255,0.4)" }}>
                        {entry.points.toLocaleString()}
                      </span>
                      <span className="text-white/30 text-xs">pts</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Rewards preview */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mb-1">Redeem Your Points</p>
                <h2 className="font-display text-white text-3xl">REWARDS</h2>
              </div>
              <Link href="/account" className="text-yellow-400 text-sm hover:text-yellow-300 transition-colors font-semibold">
                View My Points →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Tequila Fest Tee", points: 250, emoji: "👕" },
                { name: "VIP Upgrade", points: 500, emoji: "⭐" },
                { name: "Free Ticket", points: 1000, emoji: "🎟️" },
                { name: "Meet & Greet", points: 1500, emoji: "🤝" },
              ].map(reward => (
                <div key={reward.name} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center hover:border-yellow-500/20 transition-all">
                  <p className="text-3xl mb-3">{reward.emoji}</p>
                  <p className="text-white font-semibold text-sm">{reward.name}</p>
                  <p className="font-display text-yellow-400 text-xl mt-1">{reward.points.toLocaleString()}</p>
                  <p className="text-white/30 text-xs">points</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
