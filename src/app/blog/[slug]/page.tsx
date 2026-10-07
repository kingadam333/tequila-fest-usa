import { notFound } from "next/navigation";
import { loadPublishedPosts } from "@/lib/blogServer";
import BlogPostPage from "./BlogPostPage";

// Posts come from admin -> Blog, so render per request rather than from a
// build-time list.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await loadPublishedPosts()).find(p => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} — Tequila Fest USA Blog`,
    description: post.excerpt,
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = await loadPublishedPosts();
  const post = posts.find(p => p.slug === slug);
  if (!post) notFound();
  const related = posts.filter(p => p.slug !== post.slug && (p.category === post.category || p.tags.some(t => post.tags.includes(t)))).slice(0, 3);
  return <BlogPostPage post={post} related={related} />;
}
