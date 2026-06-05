"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, Tag } from "lucide-react";
import { POSTS } from "@/lib/blog";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

const CATEGORIES = ["All", ...Array.from(new Set(POSTS.map(p => p.category)))];

const CATEGORY_COLORS: Record<string, string> = {
  Guide:    "#F5A623",
  Tequila:  "#C8102E",
  Event:    "#00A878",
  Affiliate: "#7B2FBE",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogListPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? POSTS
    : POSTS.filter(p => p.category === activeCategory);

  const featured = POSTS.filter(p => p.featured);
  const rest = filtered.filter(p => !p.featured || activeCategory !== "All");

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(245,166,35,0.06) 0%, transparent 55%)" }}
        />

        {/* Hero */}
        <section className="pt-20 pb-12 px-4 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-yellow-500 text-sm font-bold tracking-[0.3em] uppercase mb-3">The Pour-Over</p>
            <h1 className="font-display leading-none" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}>
              <span className="text-shimmer">TEQUILA</span>{" "}
              <span className="text-shimmer-blue">FEST</span>{" "}
              <span className="text-white">BLOG</span>
            </h1>
            <p className="text-white/50 mt-4 max-w-xl mx-auto">
              Festival guides, tequila picks, venue previews, and everything agave.
            </p>
          </motion.div>
        </section>

        <div className="max-w-6xl mx-auto px-4 pb-24 relative">

          {/* Featured posts — only shown on All tab */}
          {activeCategory === "All" && featured.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
              <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mb-5">Featured</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {featured.map((post, i) => {
                  const color = CATEGORY_COLORS[post.category] || "#F5A623";
                  return (
                    <motion.div key={post.slug}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}>
                      <Link href={`/blog/${post.slug}`}
                        className="group block rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 hover:scale-[1.02]"
                        style={{ background: `linear-gradient(135deg, ${color}10, rgba(255,255,255,0.02))` }}>
                        {/* Color bar */}
                        <div className="h-1" style={{ background: color }} />
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{ background: `${color}20`, color }}>
                              {post.category}
                            </span>
                            <span className="flex items-center gap-1 text-white/30 text-xs">
                              <Clock size={11} /> {post.readTime} min read
                            </span>
                          </div>
                          <h2 className="font-display text-white text-2xl leading-tight mb-2 group-hover:text-yellow-400 transition-colors duration-200">
                            {post.title}
                          </h2>
                          <p className="text-white/50 text-sm leading-relaxed line-clamp-2 mb-4">{post.excerpt}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-white/25 text-xs">{formatDate(post.publishedAt)}</span>
                            <span className="text-yellow-400 text-sm font-semibold group-hover:translate-x-1 transition-transform duration-200">
                              Read more →
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${activeCategory === cat ? "bg-yellow-500 text-black" : "bg-white/5 border border-white/15 text-white/50 hover:text-white hover:border-white/30"}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* All posts grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(activeCategory === "All" ? POSTS : filtered).map((post, i) => {
              const color = CATEGORY_COLORS[post.category] || "#F5A623";
              return (
                <motion.div key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}>
                  <Link href={`/blog/${post.slug}`}
                    className="group flex flex-col h-full bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:scale-[1.02]">
                    <div className="h-0.5" style={{ background: color }} />
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}18`, color }}>
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1 text-white/25 text-xs">
                          <Clock size={10} /> {post.readTime} min
                        </span>
                      </div>
                      <h2 className="font-display text-white text-xl leading-tight mb-2 group-hover:text-yellow-400 transition-colors duration-200">
                        {post.title}
                      </h2>
                      <p className="text-white/40 text-sm leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                        <div className="flex flex-wrap gap-1">
                          {post.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-white/20 text-xs">
                              <Tag size={9} />#{tag}
                            </span>
                          ))}
                        </div>
                        <span className="text-white/25 text-xs">{formatDate(post.publishedAt)}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
