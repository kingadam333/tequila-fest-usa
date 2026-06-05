import Navbar from "@/components/Navbar";
import OfficialBanner from "@/components/OfficialBanner";
import Hero from "@/components/Hero";
import EventCards from "@/components/EventCards";
import Highlights from "@/components/Highlights";
import VIPSection from "@/components/VIPSection";
import TequilaSpotlight from "@/components/TequilaSpotlight";
import EmailSignup from "@/components/EmailSignup";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      {/* Sticky header: banner + nav stacked together */}
      <div className="sticky top-0 z-50">
        <OfficialBanner />
        <Navbar />
      </div>
      <Hero />
      <EventCards />
      <Highlights />
      <VIPSection />
      <TequilaSpotlight />

      {/* Section divider */}
      <div className="relative h-16 bg-[#0d0500] overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center px-8 gap-4">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(245,166,35,0.4))" }} />
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 rotate-45 bg-yellow-500/60" />
            <span className="font-display text-yellow-500/40 text-sm tracking-[0.3em]">TEQUILA FEST USA</span>
            <div className="w-1.5 h-1.5 rotate-45 bg-yellow-500/60" />
          </div>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(245,166,35,0.4))" }} />
        </div>
      </div>

      <EmailSignup />
      <Footer />
    </main>
  );
}
