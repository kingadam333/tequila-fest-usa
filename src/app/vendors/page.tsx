import type { Metadata } from "next";
import VendorsPage from "./VendorsPage";

export const metadata: Metadata = {
  title: "Vendors Wanted | Tequila Fest USA",
  description:
    "Sell at Tequila Fest USA — food, merchandise, and specialty product vendors wanted across 4 festival cities. Reach thousands of attendees per event. Apply today.",
  openGraph: {
    title: "Vendors Wanted | Tequila Fest USA",
    description: "Sell at Tequila Fest USA — food, merchandise, and specialty product vendors wanted across 4 festival cities.",
  },
};

export default function Page() {
  return <VendorsPage />;
}
