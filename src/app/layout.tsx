import type { Metadata } from "next";
import "./globals.css";
import SupportChat from "@/components/SupportChat";
import MetaPixel from "@/components/MetaPixel";

export const metadata: Metadata = {
  title: "Tequila Fest USA — The National Tequila Festival Tour",
  description: "Tequila Fest USA is a multi-city tequila festival touring Cincinnati, Cleveland, Columbus, and Phoenix in 2026. 50+ premium tequilas, live music, authentic food, and more.",
  openGraph: {
    title: "Tequila Fest USA",
    description: "The national tequila festival tour — 4 cities, 2026.",
    siteName: "TequilaFestUSA.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <MetaPixel />
        {children}
        <SupportChat />
      </body>
    </html>
  );
}
