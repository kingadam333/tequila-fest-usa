import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Security headers applied to every response. The CSP is intentionally
// permissive on script/connect/frame sources (https:) so it does NOT break
// Google Tag Manager, conversion pixels (Meta/Google Ads/Roku), Cloudflare
// Turnstile, Stripe, or Supabase realtime — while still preventing
// clickjacking, plugin/object injection, base-tag hijacking, and mixed content.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "form-action 'self' https:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // /Contest -> current SweepWidget giveaway. Next.js route matching is
      // case-sensitive, so both casings are covered explicitly since people
      // type/share this URL capitalized as often as not.
      {
        source: "/contest",
        destination: "https://sweepwidget.com/c/101330-tl9zaf3c",
        permanent: false,
      },
      {
        source: "/Contest",
        destination: "https://sweepwidget.com/c/101330-tl9zaf3c",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "igktkkjnyxeiflnvfzdw.supabase.co",
      },
    ],
  },
};

export default withPWA(nextConfig);
