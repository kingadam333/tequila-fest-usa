"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { User, ChevronDown } from "lucide-react";

type NavLink = { label: string; href: string; children?: { label: string; href: string }[] };

const NAV_LINKS: NavLink[] = [
  { label: "Events", href: "/#events" },
  { label: "VIP", href: "/#vip" },
  { label: "About", href: "/#about" },
  { label: "Blog", href: "/blog" },
  {
    label: "Contact",
    href: "/contact",
    children: [
      { label: "Add Your Tequila Brand", href: "/brand-packages" },
      { label: "Become a Vendor", href: "/vendors" },
      { label: "Sponsor Opportunities", href: "/sponsors" },
      { label: "Contact Support", href: "/contact" },
    ],
  },
];

type EventLink = { label: string; href: string };

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // Upcoming cities for the Events dropdown — same source as the homepage
  // cards, so adding/completing an event in admin updates the menu too.
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; firstName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.user && setUser(d.user))
      .catch(() => {});
    fetch("/api/events")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const seen = new Set<string>();
        const links: EventLink[] = [];
        for (const e of (d?.events || []) as { city?: string }[]) {
          if (!e.city) continue;
          const key = e.city.toLowerCase().trim().replace(/\s+/g, "-");
          if (seen.has(key)) continue;
          seen.add(key);
          links.push({ label: e.city, href: `/events/${key}` });
        }
        setEventLinks(links);
      })
      .catch(() => {});
  }, []);

  const navLinks: NavLink[] = NAV_LINKS.map(l =>
    l.label === "Events" && eventLinks.length ? { ...l, children: eventLinks } : l
  );

  const isLoggedIn = !!user;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

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
              src="/logo-long.png"
              alt="Tequila Fest USA"
              width={240}
              height={60}
              className="h-10 w-auto object-contain drop-shadow-lg"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => link.children ? (
              // Opens on hover and on keyboard focus; "Contact" itself stays a link.
              <div key={link.label} className="relative group">
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-1 text-white/60 hover:text-white group-hover:text-white text-sm font-medium tracking-wide transition-colors duration-200"
                >
                  {link.label}
                  <ChevronDown size={14} className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                </Link>
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity duration-150">
                  <div className="min-w-[230px] rounded-xl border border-yellow-500/20 py-2 shadow-2xl" style={{ background: "rgba(13, 5, 0, 0.97)", backdropFilter: "blur(12px)" }}>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-white/75 hover:text-yellow-400 hover:bg-white/5 focus:text-yellow-400 focus:bg-white/5 outline-none transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
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
              <div className="flex items-center gap-2">
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 border border-yellow-500/50 hover:border-yellow-400 text-yellow-400 hover:text-yellow-300 font-bold text-sm px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <User size={14} />
                  {user?.firstName || "Profile"}
                </Link>
                <button onClick={handleLogout}
                  className="text-white/80 hover:text-white/60 text-xs transition-colors cursor-pointer">
                  Log Out
                </button>
              </div>
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
              {navLinks.map((link, i) => (
                <motion.div key={link.label} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 px-2 text-white/70 hover:text-yellow-400 text-lg font-medium border-b border-white/5 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                  {link.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-2.5 pl-6 pr-2 text-white/60 hover:text-yellow-400 text-base border-b border-white/5 transition-colors duration-200"
                    >
                      {child.label}
                    </Link>
                  ))}
                </motion.div>
              ))}

              {/* Mobile auth buttons */}
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: navLinks.length * 0.05 }} className="mt-4 flex flex-col gap-3">
                {isLoggedIn ? (
                  <>
                    <Link href="/account" onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 border border-yellow-500/50 text-yellow-400 font-bold text-lg px-6 py-4 rounded-full transition-all duration-200">
                      <User size={18} /> {user?.firstName || "Profile"}
                    </Link>
                    <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="block w-full text-center border border-white/20 text-white/80 font-semibold text-base px-6 py-3 rounded-full transition-all cursor-pointer">
                      Log Out
                    </button>
                  </>
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
