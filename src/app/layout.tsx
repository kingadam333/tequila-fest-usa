import type { Metadata, Viewport } from "next";
import "./globals.css";
import SupportChat from "@/components/SupportChat";
import { GTMHeadScript, GTMBodyNoscript } from "@/components/GoogleTagManager";
import InstallBanner from "@/components/InstallBanner";

export const viewport: Viewport = {
  themeColor: "#F5A623",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Tequila Fest USA — The National Tequila Festival Tour",
  description: "Tequila Fest USA is a multi-city tequila festival touring Cincinnati, Cleveland, Columbus, and Phoenix in 2026. 50+ premium tequilas, live music, authentic food, and more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tequila Fest",
    startupImage: [
      { url: "/icons/icon-512x512.png" },
    ],
  },
  openGraph: {
    title: "Tequila Fest USA",
    description: "The national tequila festival tour — 4 cities, 2026.",
    siteName: "TequilaFestUSA.com",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
  other: {
    "facebook-domain-verification": "635vf5gns3zeu4m88hq5labmd66t8p",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <GTMHeadScript />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Tequila Fest" />
        <link rel="mask-icon" href="/icons/icon-512x512.png" color="#F5A623" />
        <meta name="msapplication-TileColor" content="#F5A623" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <GTMBodyNoscript />
        {children}
        <SupportChat />
        <InstallBanner />
      </body>
    </html>
  );
}
