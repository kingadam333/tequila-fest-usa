import type { Metadata } from "next";
import BlogListPage from "./BlogListPage";

export const metadata: Metadata = {
  title: "Blog — Tequila Fest USA",
  description: "Festival guides, tequila recommendations, venue previews, and more from the Tequila Fest USA team.",
};

export default function Page() {
  return <BlogListPage />;
}
