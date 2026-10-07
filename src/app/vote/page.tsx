import type { Metadata } from "next";
import VotePageClient from "./VotePageClient";

export const metadata: Metadata = {
  title: "Best Table Contest — Vote | Tequila Fest USA",
  description: "Rate the brand tables at Tequila Fest: Tequila Taste, Table Decoration, Staff, Souvenirs and Overall Best Experience.",
};

export default function Page() {
  return <VotePageClient />;
}
