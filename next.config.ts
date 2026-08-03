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

const nextConfig: NextConfig = {
  turbopack: {},
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
