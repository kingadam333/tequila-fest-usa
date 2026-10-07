"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, Star, X, ExternalLink } from "lucide-react";
import { slugify, type BlogRow } from "@/lib/blogAdmin";

// Admin -> Blog. Posts live in blog_posts and show on /blog on the next page
// load. Body formatting: "## Heading", "### Subheading", "- bullet",
// **bold**, and blank lines between paragraphs.

type Draft = {
  title: string; slug: string; excerpt: string; body: string; category: string; tags: string;
  image_url: string; image_alt: string; featured: boolean; published: boolean; published_at: string;
};

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const emptyDraft = (): Draft => ({
  title: "", slug: "", excerpt: "", body: "", category: "Guide", tags: "", image_url: "", image_alt: "",
  featured: false, published: false, published_at: today(),
});
const toDraft = (p: BlogRow): Draft => ({
  title: p.title, slug: p.slug, excerpt: p.excerpt || "", body: p.body || "", category: p.category || "",
  tags: (p.tags || []).join(", "), image_url: p.image_url || "", image_alt: p.image_alt || "",
  featured: p.featured, published: p.published, published_at: p.published_at.slice(0, 10),
});

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function BlogSection({ adminToken }: { adminToken: string }) {
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // null | "new" | id
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [slugTouched, setSlugTouched] = useState(false);
  const [loadedAt] = useState(() => Date.now()); // "now" for LIVE vs SCHEDULED badges

  const headers = { "Content-Type": "application/json", "x-admin-token": adminToken };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/blog", { headers: { "x-admin-token": adminToken } })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (!cancelled) setPosts(data.posts);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [adminToken]);

  const request = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    return data;
  };

  const sortPosts = (list: BlogRow[]) => [...list].sort((a, b) => b.published_at.localeCompare(a.published_at));

  const save = async () => {
    setBusy(editing);
    setError("");
    try {
      // A post dated today goes live now, not at the noon-UTC stamp a bare date gets.
      const body = { ...draft, published_at: draft.published_at === today() ? new Date().toISOString() : draft.published_at };
      if (editing === "new") {
        const { post } = await request("/api/admin/blog", "POST", body);
        setPosts(prev => sortPosts([post, ...prev]));
      } else if (editing) {
        const { post } = await request(`/api/admin/blog/${editing}`, "PATCH", body);
        setPosts(prev => sortPosts(prev.map(p => (p.id === editing ? post : p))));
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const patch = async (p: BlogRow, body: Partial<BlogRow>) => {
    setBusy(p.id);
    setError("");
    try {
      const { post } = await request(`/api/admin/blog/${p.id}`, "PATCH", body);
      setPosts(prev => prev.map(x => (x.id === p.id ? post : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p: BlogRow) => {
    if (!confirm(`Delete "${p.title}" permanently? To take it down temporarily, use Unpublish instead.`)) return;
    setBusy(p.id);
    try {
      await request(`/api/admin/blog/${p.id}`, "DELETE");
      setPosts(prev => prev.filter(x => x.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const input = "w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-yellow-500/40";
  const label = "text-white/80 text-xs uppercase tracking-wider block mb-1";
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(d => ({ ...d, [k]: e.target.value }));
  const isLive = (p: BlogRow) => p.published && new Date(p.published_at).getTime() <= loadedAt;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-white text-3xl mb-1">BLOG</h2>
          <p className="text-white/80 text-sm">Posts show on <a href="/blog" target="_blank" className="text-yellow-400 hover:underline">/blog</a> as soon as they&apos;re published and their date arrives.</p>
        </div>
        <button onClick={() => { setDraft(emptyDraft()); setSlugTouched(false); setEditing("new"); }}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-4 py-2.5 rounded-xl cursor-pointer flex-shrink-0">
          <Plus size={14} /> New Post
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {editing && (
        <div className="bg-white/[0.03] border border-yellow-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">{editing === "new" ? "New Post" : "Edit Post"}</h3>
            <button onClick={() => setEditing(null)} aria-label="Close" className="text-white/70 hover:text-white cursor-pointer"><X size={18} /></button>
          </div>
          <div>
            <label className={label}>Title</label>
            <input value={draft.title} className={input} placeholder="What to Expect at Tequila Fest Phoenix"
              onChange={e => { const title = e.target.value; setDraft(d => ({ ...d, title, slug: slugTouched ? d.slug : slugify(title) })); }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={label}>URL (tequilafestusa.com/blog/…)</label>
              <input value={draft.slug} className={`${input} font-mono`} onChange={e => { setSlugTouched(true); setDraft(d => ({ ...d, slug: slugify(e.target.value) })); }} />
            </div>
            <div>
              <label className={label}>Category</label>
              <input value={draft.category} onChange={set("category")} placeholder="Guide" className={input} list="blog-categories" />
              <datalist id="blog-categories">
                {[...new Set(["Guide", "Tequila", "Event", "Affiliate", ...posts.map(p => p.category || "")])].filter(Boolean).map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className={label}>Excerpt (shown on the blog list and in Google)</label>
            <textarea value={draft.excerpt} onChange={set("excerpt")} rows={2} className={`${input} resize-y`} />
          </div>
          <div>
            <label className={label}>Body</label>
            <textarea value={draft.body} onChange={set("body")} rows={16} className={`${input} resize-y font-mono text-[13px] leading-relaxed`}
              placeholder={"## Heading\n\nA paragraph with **bold** text.\n\n### Subheading\n- A bullet\n- Another bullet"} />
            <p className="text-white/50 text-xs mt-1">Use ## for headings, ### for subheadings, - for bullets, **text** for bold, and a blank line between paragraphs.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>Cover image URL</label>
              <input value={draft.image_url} onChange={set("image_url")} placeholder="https://…" className={input} />
            </div>
            <div>
              <label className={label}>Image description (for screen readers)</label>
              <input value={draft.image_alt} onChange={set("image_alt")} className={input} />
            </div>
            <div>
              <label className={label}>Tags (comma separated)</label>
              <input value={draft.tags} onChange={set("tags")} placeholder="guide, phoenix" className={input} />
            </div>
            <div>
              <label className={label}>Publish date</label>
              <input type="date" value={draft.published_at} onChange={set("published_at")} className={input} style={{ colorScheme: "dark" }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
              <input type="checkbox" checked={draft.published} onChange={e => setDraft(d => ({ ...d, published: e.target.checked }))} className="accent-yellow-500" />
              Published <span className="text-white/50 text-xs">(unchecked = draft, not on the site)</span>
            </label>
            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
              <input type="checkbox" checked={draft.featured} onChange={e => setDraft(d => ({ ...d, featured: e.target.checked }))} className="accent-yellow-500" />
              Featured at the top of /blog
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="text-white/80 hover:text-white text-sm px-4 py-2 cursor-pointer">Cancel</button>
            <button onClick={save} disabled={busy !== null || !draft.title.trim()}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold text-sm px-5 py-2 rounded-xl cursor-pointer disabled:cursor-not-allowed">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {loading ? <p className="text-white/70 text-sm">Loading…</p> : posts.length === 0 ? (
        <p className="text-white/70 text-sm">No posts yet. Click New Post to write one.</p>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className={`flex flex-wrap items-center justify-between gap-3 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 ${busy === p.id ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm flex items-center gap-2 flex-wrap">
                  {p.title}
                  {!p.published ? <span className="text-[10px] font-bold tracking-widest border border-white/20 text-white/70 rounded-full px-2 py-0.5">DRAFT</span>
                    : !isLive(p) ? <span className="text-[10px] font-bold tracking-widest border border-blue-500/30 text-blue-400 rounded-full px-2 py-0.5">SCHEDULED</span>
                    : <span className="text-[10px] font-bold tracking-widest border border-green-500/30 text-green-400 rounded-full px-2 py-0.5">LIVE</span>}
                  {p.featured && <Star size={12} className="text-yellow-400" fill="currentColor" />}
                </p>
                <p className="text-white/60 text-xs">{p.category || "—"} · {fmt(p.published_at)} · /blog/{p.slug}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {isLive(p) && <a href={`/blog/${p.slug}`} target="_blank" title="View" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5"><ExternalLink size={14} /></a>}
                <button title={p.published ? "Unpublish" : "Publish"} onClick={() => patch(p, { published: !p.published })} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 cursor-pointer">
                  {p.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button title="Edit" onClick={() => { setDraft(toDraft(p)); setSlugTouched(true); setEditing(p.id); }} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"><Edit2 size={14} /></button>
                <button title="Delete" onClick={() => remove(p)} className="p-2 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/5 cursor-pointer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
