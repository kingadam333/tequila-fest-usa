"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";

const NAV_LINKS = [
  { label: "Events", href: "/#events" },
  { label: "VIP", href: "/#vip" },
  { label: "About", href: "/#about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // TODO: replace with real auth state
  const isLoggedIn = false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full z-40 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13, 5, 0, 0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(245,166,35,0.12)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/tequilafest_usa.png"
              alt="Tequila Fest USA"
              width={120}
              height={120}
              className="w-10 h-10 object-contain drop-shadow-lg"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-white/60 hover:text-white text-sm font-medium tracking-wide transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                href="/account"
                className="inline-flex items-center gap-2 border border-yellow-500/50 hover:border-yellow-400 text-yellow-400 hover:text-yellow-300 font-bold text-sm px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-105"
              >
                <User size={14} />
                Profile
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-yellow-400 hover:text-yellow-300 font-bold text-sm px-4 py-2.5 rounded-full border border-yellow-500/40 hover:border-yellow-400 transition-all duration-200 hover:scale-105"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            aria-label="Toggle menu"
          >
            <motion.span animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="block w-6 h-0.5 bg-white origin-center transition-all" />
            <motion.span animate={menuOpen ? { opacity: 0 } : { opacity: 1 }} className="block w-6 h-0.5 bg-white" />
            <motion.span animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="block w-6 h-0.5 bg-white origin-center transition-all" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-0 right-0 z-30 md:hidden"
            style={{
              background: "rgba(13, 5, 0, 0.97)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(245,166,35,0.15)",
            }}
          >
            <div className="px-4 py-6 flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.div key={link.label} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 px-2 text-white/70 hover:text-yellow-400 text-lg font-medium border-b border-white/5 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              {/* Mobile auth buttons */}
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: NAV_LINKS.length * 0.05 }} className="mt-4 flex flex-col gap-3">
                {isLoggedIn ? (
                  <Link href="/account" onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-2 border border-yellow-500/50 text-yellow-400 font-bold text-lg px-6 py-4 rounded-full transition-all duration-200">
                    <User size={18} /> Profile
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" onClick={() => setMenuOpen(false)}
                      className="block w-full text-center bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg px-6 py-4 rounded-full transition-all duration-200">
                      Sign Up
                    </Link>
                    <Link href="/login" onClick={() => setMenuOpen(false)}
                      className="block w-full text-center border border-yellow-500/40 text-yellow-400 font-bold text-lg px-6 py-4 rounded-full transition-all duration-200">
                      Log In
                    </Link>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
