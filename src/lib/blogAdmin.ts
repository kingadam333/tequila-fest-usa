// Admin -> Blog create/update body -> writable blog_posts columns.
export type BlogRow = {
  id: string; slug: string; title: string; excerpt: string | null; body: string | null; category: string | null;
  author: string | null; image_url: string | null; image_alt: string | null; tags: string[]; featured: boolean;
  published: boolean; published_at: string; created_at: string; updated_at: string;
};

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function parseBlogInput(body: unknown, { partial }: { partial: boolean }):
  { ok: true; values: Partial<BlogRow> } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const v: Partial<BlogRow> = {};
  const str = (k: string, max: number) => (typeof b[k] === "string" ? (b[k] as string).trim().slice(0, max) : "");

  if (!partial || "title" in b) {
    const title = str("title", 200);
    if (!title) return { ok: false, error: "Title is required" };
    v.title = title;
  }
  if (!partial || "slug" in b) {
    const slug = slugify(str("slug", 120) || v.title || "");
    if (!slug) return { ok: false, error: "Slug is required" };
    v.slug = slug;
  }
  for (const [k, max] of [["excerpt", 500], ["body", 100000], ["category", 60], ["author", 120], ["image_url", 1000], ["image_alt", 300]] as const) {
    if (k in b) (v as Record<string, unknown>)[k] = str(k, max) || null;
  }
  if (v.image_url && !/^https?:\/\//i.test(v.image_url) && !v.image_url.startsWith("/")) return { ok: false, error: "Image must be a full https:// URL" };
  if ("tags" in b) {
    const raw = Array.isArray(b.tags) ? b.tags : typeof b.tags === "string" ? b.tags.split(",") : [];
    v.tags = [...new Set(raw.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  }
  if ("featured" in b) v.featured = Boolean(b.featured);
  if ("published" in b) v.published = Boolean(b.published);
  if ("published_at" in b) {
    const raw = b.published_at;
    if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) v.published_at = new Date(`${raw}T12:00:00Z`).toISOString();
    else if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) v.published_at = new Date(raw).toISOString();
    else return { ok: false, error: "Publish date must be a date" };
  }
  return { ok: true, values: v };
}
