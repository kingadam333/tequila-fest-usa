import type { Metadata } from "next";
import SponsorsPageClient from "./SponsorsPageClient";
import { loadActiveSponsorPackages } from "@/lib/sponsorPackagesServer";
import { ALL_SIGNUP_OPTION_IDS, closedOptionIds, openSignupCities } from "@/lib/eventSignups";

export const metadata: Metadata = {
  title: "Sponsorship Packages | Tequila Fest USA",
  description: "Sponsor Tequila Fest USA and put your brand in front of thousands of tequila fans in Ohio and Phoenix. Reserve your sponsorship package online.",
};

// Per request, so packages marked sold or hidden in admin -> Sponsors update immediately.
export const dynamic = "force-dynamic";

export default async function Page() {
  const closedEventIds = closedOptionIds(await openSignupCities(), ALL_SIGNUP_OPTION_IDS);
  return <SponsorsPageClient packages={await loadActiveSponsorPackages()} closedEventIds={closedEventIds} />;
}
