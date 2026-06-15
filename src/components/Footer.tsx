"use client";

import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-white/10 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
          {/* Brand */}
          <div>
            <Image
              src="/tequilafest_usa.png"
              alt="Tequila Fest USA"
              width={160}
              height={160}
              className="w-24 mb-2 drop-shadow-lg"
            />
            <p className="text-white/30 text-sm">The National Tequila Festival Tour</p>
          </div>

          {/* Tour stops */}
          <div>
            <p className="text-white/20 text-xs font-bold tracking-[0.2em] uppercase mb-3">Tour</p>
            <ul className="space-y-1.5">
              {[
                { city: "Cincinnati, OH", date: "Jun 13" },
                { city: "Cleveland, OH", date: "Jul 25" },
                { city: "Columbus, OH", date: "Aug 8" },
                { city: "Phoenix, AZ", date: "Nov 14" },
              ].map((s) => (
                <li key={s.city} className="flex items-center gap-3 text-sm text-white/40">
                  <span className="w-1 h-1 rounded-full bg-yellow-500/60" />
                  <span>{s.city}</span>
                  <span className="text-white/20">·</span>
                  <span>{s.date}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <p className="text-white/20 text-xs font-bold tracking-[0.2em] uppercase mb-3">Links</p>
            <ul className="space-y-1.5">
              {[
                { label: "Get Tickets", href: "/#events" },
                { label: "Earn Points", href: "/earn-points" },
                { label: "Contact", href: "mailto:info@tequilafestusa.com" },
                { label: "Become an Affiliate", href: "/affiliates" },
                { label: "Sponsor Opportunities", href: "/contact" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/40 hover:text-yellow-400 transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="text-white/20 text-xs font-bold tracking-[0.2em] uppercase mb-3">Follow Us</p>
            <div className="flex gap-3">
              {[
                { name: "Instagram", href: "https://instagram.com/tequilafestusa" },
                { name: "Facebook", href: "https://facebook.com/tequilafestusa" },
                { name: "TikTok", href: "https://tiktok.com/@tequilafestusa" },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-white/20 hover:border-yellow-500/60 flex items-center justify-center text-white/40 hover:text-yellow-400 transition-all duration-200 cursor-pointer text-xs font-bold"
                  aria-label={s.name}
                >
                  {s.name[0]}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">© {year} Tequila Fest USA · All Rights Reserved</p>
          <p className="text-white/15 text-xs text-center">
            Please drink responsibly. Must be 21+ to attend. Tickets sold exclusively at TequilaFestUSA.com.
          </p>
        </div>
      </div>
    </footer>
  );
}
