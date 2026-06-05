"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Tag, Calendar } from "lucide-react";
import type { BlogPost } from "@/lib/blog";
import { POSTS } from "@/lib/blog";
import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Footer from "@/components/Footer";

const CATEGORY_COLORS: Record<string, string> = {
  Guide:     "#F5A623",
  Tequila:   "#C8102E",
  Event:     "#00A878",
  Affiliate: "#7B2FBE",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Simple markdown-ish renderer for our post body
function PostBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="font-display text-yellow-400 text-2xl mt-8 mb-3">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="font-display text-white text-3xl mt-10 mb-4">{line.slice(3)}</h2>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={i} className="text-white font-semibold text-lg mt-4 mb-2">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("- ")) {
      // Collect consecutive list items
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="space-y-2 my-4 ml-4">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-white/70 leading-relaxed">
              <span className="text-yellow-500 mt-1.5 flex-shrink-0">▸</span>
              {/* Handle inline bold */}
              <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (line.trim() === "") {
      // skip empty lines
    } else {
      // Regular paragraph — handle inline bold
      elements.push(
        <p key={i} className="text-white/70 leading-relaxed my-3"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }}
        />
      );
    }
    i++;
  }

  return <div>{elements}</div>;
}

export default function BlogPostPage({ post }: { post: BlogPost }) {
  const color = CATEGORY_COLORS[post.category] || "#F5A623";
  const related = POSTS.filter(p => p.slug !== post.slug && (p.category === post.category || p.tags.some(t => post.tags.includes(t)))).slice(0, 3);

  return (
    <>
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0d0500]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 20%, ${color}08 0%, transparent 55%)` }}
        />

        <div className="max-w-3xl mx-auto px-4 pt-12 pb-24 relative">

          {/* Back */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Link href="/blog" className="inline-flex items-center gap-2 text-white/35 hover:text-white/65 text-sm mb-10 transition-colors duration-200">
              <ArrowLeft size={14} /> Back to Blog
            </Link>
          </motion.div>

          {/* Hero image */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-10">
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0500]/80 via-transparent to-transparent" />
          </motion.div>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                {post.category}
              </span>
              <span className="flex items-center gap-1.5 text-white/30 text-sm">
                <Clock size={13} /> {post.readTime} min read
              </span>
              <span className="flex items-center gap-1.5 text-white/30 text-sm">
                <Calendar size={13} /> {formatDate(post.publishedAt)}
              </span>
            </div>

            <h1 className="font-display text-white leading-tight mb-4" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              {post.title}
            </h1>

            <p className="text-white/50 text-lg leading-relaxed mb-8 border-l-2 pl-4" style={{ borderColor: color }}>
              {post.excerpt}
            </p>

            {/* Divider */}
            <div className="h-px mb-10" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
          </motion.div>

          {/* Body */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <PostBody body={post.body} />
          </motion.div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-white/10">
            {post.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 text-white/30 text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <Tag size={10} /> #{tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-2xl p-6 text-center border"
            style={{ background: `${color}10`, borderColor: `${color}30` }}
          >
            <p className="font-display text-white text-2xl mb-2">READY TO JOIN US?</p>
            <p className="text-white/50 text-sm mb-5">Grab your tickets before Early Bird pricing ends.</p>
            <Link href="/#events"
              className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3.5 rounded-full transition-all duration-200 hover:scale-105">
              Get Tickets — From $55
            </Link>
          </motion.div>

          {/* Related posts */}
          {related.length > 0 && (
            <div className="mt-16">
              <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mb-5">More From The Blog</p>
              <div className="space-y-3">
                {related.map(p => {
                  const c = CATEGORY_COLORS[p.category] || "#F5A623";
                  return (
                    <Link key={p.slug} href={`/blog/${p.slug}`}
                      className="group flex items-center gap-4 bg-white/[0.03] border border-white/10 hover:border-white/20 rounded-xl px-4 py-3.5 transition-all duration-200">
                      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: c }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 group-hover:text-yellow-400 text-sm font-medium truncate transition-colors duration-200">{p.title}</p>
                        <p className="text-white/25 text-xs mt-0.5">{p.category} · {p.readTime} min read</p>
                      </div>
                      <span className="text-white/20 group-hover:text-yellow-400 transition-colors duration-200 flex-shrink-0">→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
