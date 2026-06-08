"use client";

import { useEffect, useState, useCallback } from "react";
import { EVENTS } from "@/lib/events";

type Account = {
  id: string;
  city: string;
  fb_page_id: string;
  fb_page_name?: string;
  fb_page_access_token: string;
  ig_user_id?: string;
  dropbox_city_folder?: string;
  enabled: boolean;
};

type DbxFile = { path: string; name: string; isImage: boolean; isVideo: boolean };

type SocialPost = {
  id: string;
  city: string;
  platform: string;
  post_type: string;
  caption: string;
  asset_path?: string;
  external_post_id?: string;
  status: string;
  error?: string;
  posted_at: string;
};

type Settings = {
  brands_folder: string;
  memes_folder: string;
  cities_folder_root: string;
  auto_post_enabled: boolean;
  default_brand_caption_tone: string;
};

export default function SocialShareSection({ adminToken }: { adminToken: string }) {
  const [tab, setTab] = useState<"compose" | "accounts" | "history" | "settings">("compose");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-yellow-400">Social Share</h1>
          <p className="text-white/40 text-sm">Post to Facebook + Instagram, and let AI run daily auto-posts.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10">
        {(["compose", "accounts", "history", "settings"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize cursor-pointer border-b-2 transition-all ${
              tab === t ? "border-yellow-500 text-yellow-400" : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "compose"  && <ComposeTab adminToken={adminToken} />}
      {tab === "accounts" && <AccountsTab adminToken={adminToken} />}
      {tab === "history"  && <HistoryTab adminToken={adminToken} />}
      {tab === "settings" && <SettingsTab adminToken={adminToken} />}
    </div>
  );
}

// ─── Compose ────────────────────────────────────────────────────────────────
function ComposeTab({ adminToken }: { adminToken: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [city, setCity] = useState("");
  const [platforms, setPlatforms] = useState<("facebook" | "instagram")[]>(["facebook", "instagram"]);
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "none">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [dropboxPath, setDropboxPath] = useState("");
  const [dbxFiles, setDbxFiles] = useState<DbxFile[]>([]);
  const [dbxFolder, setDbxFolder] = useState("");
  const [dbxConfigured, setDbxConfigured] = useState(false);
  const [postType, setPostType] = useState<"event" | "brand" | "meme" | "manual">("event");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/social/accounts", { headers: { "x-admin-token": adminToken } })
      .then(r => r.json())
      .then(j => {
        setAccounts(j.accounts || []);
        if ((j.accounts || []).length && !city) setCity(j.accounts[0].city);
      });
  }, [adminToken, city]);

  const loadDbx = useCallback(async (folder: string) => {
    setDbxFolder(folder);
    setDbxFiles([]);
    const res = await fetch(`/api/admin/social/dropbox?path=${encodeURIComponent(folder)}`, {
      headers: { "x-admin-token": adminToken },
    });
    const j = await res.json();
    setDbxConfigured(j.configured);
    setDbxFiles(j.files || []);
  }, [adminToken]);

  useEffect(() => {
    const acct = accounts.find(a => a.city === city);
    if (acct?.dropbox_city_folder) loadDbx(acct.dropbox_city_folder);
  }, [city, accounts, loadDbx]);

  const generateAI = async () => {
    setAiBusy(true);
    try {
      const res = await fetch("/api/admin/social/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ type: postType, city, platform: "both", hint: dropboxPath?.split("/").pop() }),
      });
      const j = await res.json();
      if (j.caption) setCaption(j.caption);
      else setResult(`AI error: ${j.error || "no caption"}`);
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/social/post", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          city, platforms, caption, mediaType,
          mediaUrl: mediaUrl || undefined,
          dropboxPath: dropboxPath || undefined,
          postType,
        }),
      });
      const j = await res.json();
      if (res.ok) {
        setResult(`Posted: ${(j.results || []).map((r: any) => `${r.platform}=${r.ok ? "✓" : "✗ " + (r.error || "")}`).join(" · ")}`);
      } else {
        setResult(`Error: ${j.error || res.statusText}`);
      }
    } catch (e: any) {
      setResult(`Error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  if (!accounts.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/60 text-sm">
        No social accounts connected yet. Go to <b className="text-yellow-400">Accounts</b> to connect a city's Facebook Page.
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="City">
          <select value={city} onChange={e => setCity(e.target.value)} className="input">
            {accounts.map(a => <option key={a.id} value={a.city}>{a.city} — {a.fb_page_name || a.fb_page_id}</option>)}
          </select>
        </Field>

        <Field label="Platforms">
          <div className="flex gap-3 text-sm">
            {(["facebook", "instagram"] as const).map(p => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={platforms.includes(p)} onChange={e => {
                  setPlatforms(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p));
                }} />
                <span className="capitalize">{p}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Post type">
          <select value={postType} onChange={e => setPostType(e.target.value as any)} className="input">
            <option value="event">Event promo</option>
            <option value="brand">Brand spotlight</option>
            <option value="meme">Meme</option>
            <option value="manual">Manual / other</option>
          </select>
        </Field>

        <Field label="Media">
          <div className="space-y-2">
            <select value={mediaType} onChange={e => setMediaType(e.target.value as any)} className="input">
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="none">None (FB text-only — IG will skip)</option>
            </select>
            {mediaType !== "none" && (
              <>
                <input
                  type="text"
                  placeholder="Direct media URL (or pick from Dropbox below)"
                  value={mediaUrl}
                  onChange={e => { setMediaUrl(e.target.value); if (e.target.value) setDropboxPath(""); }}
                  className="input"
                />
                <div className="rounded-lg border border-white/10 bg-black/40 p-2 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/40">Dropbox: {dbxFolder || "(no folder)"}</p>
                    <button onClick={() => loadDbx(dbxFolder)} className="text-xs text-yellow-400 hover:underline cursor-pointer">Refresh</button>
                  </div>
                  {!dbxConfigured && <p className="text-xs text-white/40">Dropbox not configured — set env vars.</p>}
                  {dbxFiles.length === 0 && dbxConfigured && <p className="text-xs text-white/40">No files in folder.</p>}
                  <div className="space-y-1">
                    {dbxFiles.map(f => (
                      <button
                        key={f.path}
                        onClick={() => { setDropboxPath(f.path); setMediaUrl(""); setMediaType(f.isVideo ? "video" : "image"); }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs cursor-pointer ${dropboxPath === f.path ? "bg-yellow-500/20 text-yellow-300" : "hover:bg-white/5 text-white/70"}`}
                      >
                        {f.isVideo ? "🎥" : "🖼️"} {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Field>
      </div>

      <div className="space-y-4">
        <Field label="Caption">
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={8}
            className="input"
            placeholder="Write the post copy here, or click Generate with AI."
          />
          <button
            onClick={generateAI}
            disabled={aiBusy}
            className="mt-2 text-xs text-yellow-400 hover:underline cursor-pointer disabled:opacity-50"
          >
            {aiBusy ? "Generating…" : "✨ Generate with AI"}
          </button>
        </Field>

        <button
          onClick={submit}
          disabled={busy || !caption || !platforms.length}
          className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Posting…" : "Post Now"}
        </button>

        {result && <div className="text-sm text-white/70 bg-black/40 border border-white/10 rounded-lg p-3">{result}</div>}
      </div>
    </div>
  );
}

// ─── Accounts ───────────────────────────────────────────────────────────────
function AccountsTab({ adminToken }: { adminToken: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/social/accounts", { headers: { "x-admin-token": adminToken } })
      .then(r => r.json()).then(j => setAccounts(j.accounts || []));
  }, [adminToken]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const j = await res.json();
        alert(`Save failed: ${j.error || res.statusText}`);
        return;
      }
      setEditing(null);
      load();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this connection?")) return;
    await fetch(`/api/admin/social/accounts?id=${id}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
    load();
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-white/60 text-sm">Connect each city's Facebook Page + Instagram Business account.</p>
        <button onClick={() => setEditing({ city: "", fb_page_id: "", fb_page_access_token: "", enabled: true })}
          className="bg-yellow-500 text-black text-sm font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-yellow-400">
          + Connect city
        </button>
      </div>

      <div className="space-y-2">
        {accounts.map(a => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-white font-semibold capitalize">{a.city}</p>
              <p className="text-white/40 text-xs">FB: {a.fb_page_name || a.fb_page_id} {a.ig_user_id && `· IG: ${a.ig_user_id}`}</p>
              <p className="text-white/30 text-xs">Dropbox: {a.dropbox_city_folder || "—"} · Token: {a.fb_page_access_token}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...a, fb_page_access_token: "" })} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer">Edit</button>
              <button onClick={() => remove(a.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer">Delete</button>
            </div>
          </div>
        ))}
        {!accounts.length && <p className="text-white/40 text-sm">No accounts yet.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[#1a0c00] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-yellow-400 text-2xl mb-4">Connect city</h3>
            <div className="space-y-3">
              <Field label="City">
                <select value={editing.city || ""} onChange={e => setEditing({ ...editing, city: e.target.value })} className="input">
                  <option value="">— Select —</option>
                  {EVENTS.map(ev => <option key={ev.slug} value={ev.slug}>{ev.city}</option>)}
                </select>
              </Field>
              <Field label="Facebook Page ID"><input className="input" value={editing.fb_page_id || ""} onChange={e => setEditing({ ...editing, fb_page_id: e.target.value })} /></Field>
              <Field label="Facebook Page name (optional)"><input className="input" value={editing.fb_page_name || ""} onChange={e => setEditing({ ...editing, fb_page_name: e.target.value })} /></Field>
              <Field label="Page Access Token (long-lived)"><input className="input" type="password" placeholder={editing.id ? "Leave blank to keep existing" : ""} value={editing.fb_page_access_token || ""} onChange={e => setEditing({ ...editing, fb_page_access_token: e.target.value })} /></Field>
              <Field label="Instagram Business Account ID (optional)"><input className="input" value={editing.ig_user_id || ""} onChange={e => setEditing({ ...editing, ig_user_id: e.target.value })} /></Field>
              <Field label="Dropbox city folder (e.g. /cities/cincinnati)"><input className="input" value={editing.dropbox_city_folder || ""} onChange={e => setEditing({ ...editing, dropbox_city_folder: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.enabled !== false} onChange={e => setEditing({ ...editing, enabled: e.target.checked })} /> Enabled
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 disabled:opacity-50 cursor-pointer">{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History ────────────────────────────────────────────────────────────────
function HistoryTab({ adminToken }: { adminToken: string }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  useEffect(() => {
    fetch("/api/admin/social/history", { headers: { "x-admin-token": adminToken } })
      .then(r => r.json()).then(j => setPosts(j.posts || []));
  }, [adminToken]);
  return (
    <div className="space-y-2">
      {posts.map(p => (
        <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.status === "posted" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>{p.status}</span>
            <span className="text-xs text-white/40">{p.platform} · {p.post_type} · {p.city || "—"} · {new Date(p.posted_at).toLocaleString()}</span>
          </div>
          <p className="text-sm text-white/80 whitespace-pre-wrap">{p.caption}</p>
          {p.asset_path && <p className="text-xs text-white/30 mt-1">📎 {p.asset_path}</p>}
          {p.error && <p className="text-xs text-red-300 mt-1">⚠️ {p.error}</p>}
        </div>
      ))}
      {!posts.length && <p className="text-white/40 text-sm">No posts yet.</p>}
    </div>
  );
}

// ─── Settings ───────────────────────────────────────────────────────────────
function SettingsTab({ adminToken }: { adminToken: string }) {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/social/settings", { headers: { "x-admin-token": adminToken } })
      .then(r => r.json()).then(j => setS(j.settings));
  }, [adminToken]);

  const save = async () => {
    if (!s) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/social/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify(s),
    });
    setBusy(false);
    setMsg(res.ok ? "Saved." : "Save failed.");
  };

  const triggerNow = async (type: "event" | "brand" | "meme") => {
    setMsg("Running…");
    const res = await fetch(`/api/cron/social-auto-post?type=${type}`, { headers: { "x-admin-token": adminToken } });
    const j = await res.json();
    setMsg(JSON.stringify(j, null, 2));
  };

  if (!s) return <p className="text-white/40 text-sm">Loading…</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={s.auto_post_enabled} onChange={e => setS({ ...s, auto_post_enabled: e.target.checked })} />
        Enable daily AI auto-posts (3/day: 10a / 2p / 7p ET)
      </label>
      <Field label="Brands folder (Dropbox)"><input className="input" value={s.brands_folder} onChange={e => setS({ ...s, brands_folder: e.target.value })} /></Field>
      <Field label="Memes folder (Dropbox)"><input className="input" value={s.memes_folder} onChange={e => setS({ ...s, memes_folder: e.target.value })} /></Field>
      <Field label="Cities folder root (Dropbox)"><input className="input" value={s.cities_folder_root} onChange={e => setS({ ...s, cities_folder_root: e.target.value })} /></Field>
      <Field label="Caption tone"><input className="input" value={s.default_brand_caption_tone} onChange={e => setS({ ...s, default_brand_caption_tone: e.target.value })} /></Field>

      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="bg-yellow-500 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50 cursor-pointer">{busy ? "Saving…" : "Save"}</button>
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-white/60 text-sm mb-2">Trigger an auto-post manually (uses settings + connected accounts):</p>
        <div className="flex gap-2">
          <button onClick={() => triggerNow("event")} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer">Run event post</button>
          <button onClick={() => triggerNow("brand")} className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer">Run brand post</button>
          <button onClick={() => triggerNow("meme")}  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer">Run meme post</button>
        </div>
      </div>

      {msg && <pre className="text-xs text-white/60 bg-black/40 border border-white/10 rounded-lg p-3 whitespace-pre-wrap">{msg}</pre>}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1 font-medium">{label}</label>
      {children}
      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          font-size: 14px;
          outline: none;
        }
        :global(.input:focus) { border-color: rgba(245, 166, 35, 0.5); }
      `}</style>
    </div>
  );
}
