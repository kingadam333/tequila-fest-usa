import OfficialBanner from "@/components/OfficialBanner";
import Hero from "@/components/Hero";
import EventCards from "@/components/EventCards";
import Highlights from "@/components/Highlights";
import VIPSection from "@/components/VIPSection";
import EmailSignup from "@/components/EmailSignup";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <OfficialBanner />
      <Hero />
      <EventCards />
      <Highlights />
      <VIPSection />
      <EmailSignup />
      <Footer />
    </main>
  );
}
