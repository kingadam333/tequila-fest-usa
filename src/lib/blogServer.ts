// Server-only: published blog posts from the blog_posts table (admin -> Blog).
// blog_posts isn't readable by anon at all, so this goes through the service
// role and filters to published posts whose publish date has arrived. If the
// table can't be read, the built-in posts in src/lib/blog.ts are served
// instead so the blog never renders empty by accident.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { POSTS, type BlogPost } from "@/lib/blog";

type Row = {
  slug: string; title: string; excerpt: string | null; body: string | null; category: string | null; author: string | null;
  image_url: string | null; image_alt: string | null; tags: string[] | null; featured: boolean; published_at: string;
};

export const readTimeMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

const toPost = (r: Row): BlogPost => ({
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt || "",
  body: r.body || "",
  category: r.category || "News",
  author: r.author || "Tequila Fest USA",
  publishedAt: r.published_at,
  readTime: readTimeMinutes(r.body || ""),
  featured: r.featured,
  tags: r.tags || [],
  image: r.image_url || "",
  imageAlt: r.image_alt || r.title,
});

export async function loadPublishedPosts(): Promise<BlogPost[]> {
  try {
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data, error } = await db
      .from("blog_posts")
      .select("slug, title, excerpt, body, category, author, image_url, image_alt, tags, featured, published_at")
      .eq("published", true)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(toPost);
  } catch (err) {
    console.error("[blog] load failed, serving built-in posts:", err);
    return POSTS;
  }
}
