import type { Metadata } from "next";
import BrandPackagesPage from "./BrandPackagesPage";

export const metadata: Metadata = {
  title: "Brand Packages | Tequila Fest USA",
  description:
    "Showcase your tequila brand to thousands of fans across 4 U.S. festival cities. Pour, sample, and sell with curated brand packages designed for visibility and ROI.",
};

export default function Page() {
  return <BrandPackagesPage />;
}
