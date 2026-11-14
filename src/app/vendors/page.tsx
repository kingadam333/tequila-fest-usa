import type { Metadata } from "next";
import VendorsPage from "./VendorsPage";
import { cityId, openSignupCities } from "@/lib/eventSignups";

export const metadata: Metadata = {
  title: "Vendors Wanted | Tequila Fest USA",
  description:
    "Sell at Tequila Fest USA — food, merchandise, and specialty product vendors wanted across 4 festival cities. Reach thousands of attendees per event. Apply today.",
  openGraph: {
    title: "Vendors Wanted | Tequila Fest USA",
    description: "Sell at Tequila Fest USA — food, merchandise, and specialty product vendors wanted across 4 festival cities.",
  },
};

// Per request, so a city opens to applications as soon as it gets a real date.
export const dynamic = "force-dynamic";

const VENDOR_CITIES = ["Cincinnati", "Cleveland", "Columbus", "Phoenix"];

export default async function Page() {
  const open = await openSignupCities();
  return <VendorsPage closedCities={open ? VENDOR_CITIES.filter((c) => !open.has(cityId(c))) : []} />;
}
