import type { Metadata } from "next";
import BrandPackagesPage from "./BrandPackagesPage";
import { loadActiveSponsorPackages } from "@/lib/sponsorPackagesServer";

export const metadata: Metadata = {
  title: "Brand Packages | Tequila Fest USA",
  description:
    "Showcase your tequila brand to thousands of fans across 4 U.S. festival cities. Pour, sample, and sell with curated brand packages designed for visibility and ROI.",
};

// Rendered per request so sold/available changes made in admin -> Sponsors
// show up immediately rather than after a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  return <BrandPackagesPage sponsorPackages={await loadActiveSponsorPackages()} />;
}
