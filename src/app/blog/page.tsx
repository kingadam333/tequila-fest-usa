import type { Metadata } from "next";
import BlogListPage from "./BlogListPage";
import { loadPublishedPosts } from "@/lib/blogServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — Tequila Fest USA",
  description: "Festival guides, tequila recommendations, venue previews, and more from the Tequila Fest USA team.",
};

export default async function Page() {
  return <BlogListPage posts={await loadPublishedPosts()} />;
}
