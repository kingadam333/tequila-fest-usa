import type { Metadata } from "next";
import SponsorsPageClient from "./SponsorsPageClient";
import { loadActiveSponsorPackages } from "@/lib/sponsorPackagesServer";

export const metadata: Metadata = {
  title: "Sponsorship Packages | Tequila Fest USA",
  description: "Sponsor Tequila Fest USA and put your brand in front of thousands of tequila fans in Ohio and Phoenix. Reserve your sponsorship package online.",
};

// Per request, so packages marked sold or hidden in admin -> Sponsors update immediately.
export const dynamic = "force-dynamic";

export default async function Page() {
  return <SponsorsPageClient packages={await loadActiveSponsorPackages()} />;
}
