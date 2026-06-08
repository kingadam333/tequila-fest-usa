import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { listFolder, listFolders, getTemporaryLink, isConfigured as dbxConfigured } from "@/lib/social/dropbox";
import { generateCaption } from "@/lib/social/captions";
import { postToFacebook, postToInstagram, type PostMedia } from "@/lib/social/meta";

// Vercel cron hits this. Auth via CRON_SECRET (Vercel sets `Authorization: Bearer $CRON_SECRET`).
// Manual trigger from admin uses the x-admin-token header.

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken && adminToken === process.env.ADMIN_PASSWORD) return true;
  return false;
}

function pickRandom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "event") as "event" | "brand" | "meme";

  const db = supabaseAdmin as any;
  const { data: settings } = await db.from("social_settings").select("*").eq("id", 1).single();
  if (!settings?.auto_post_enabled) {
    return NextResponse.json({ ok: false, skipped: "auto_post_enabled=false" });
  }

  const { data: accounts } = await db
    .from("social_accounts")
    .select("*")
    .eq("enabled", true);
  if (!accounts?.length) return NextResponse.json({ ok: false, skipped: "no accounts" });

  if (!dbxConfigured() && type !== "event") {
    return NextResponse.json({ ok: false, skipped: "dropbox not configured" });
  }

  // Collect recently-used asset paths to avoid repeats (last 30 days)
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: recent } = await db
    .from("social_posts")
    .select("asset_path")
    .gte("posted_at", since)
    .not("asset_path", "is", null);
  const usedPaths = new Set<string>((recent || []).map((r: any) => r.asset_path));

  const summary: any[] = [];

  for (const acct of accounts) {
    try {
      // Pick asset folder per type
      let folder: string | null = null;
      let brandName: string | undefined;

      if (type === "event") {
        folder = acct.dropbox_city_folder || `${settings.cities_folder_root}/${acct.city}`;
      } else if (type === "brand") {
        // Pick a random brand subfolder
        const brandFolders = await listFolders(settings.brands_folder);
        const f = pickRandom(brandFolders);
        if (f) {
          folder = f;
          brandName = f.split("/").pop()?.replace(/[-_]/g, " ");
        }
      } else if (type === "meme") {
        folder = settings.memes_folder;
      }

      let media: PostMedia = { type: "none" };
      let assetPath: string | undefined;

      if (folder && dbxConfigured()) {
        const files = await listFolder(folder).catch(() => []);
        const fresh = files.filter(f => !usedPaths.has(f.path));
        const pool = fresh.length ? fresh : files;
        const pick = pickRandom(pool);
        if (pick) {
          assetPath = pick.path;
          const url = await getTemporaryLink(pick.path);
          media = { type: pick.isVideo ? "video" : "image", url };
        }
      }

      const caption = await generateCaption({
        type,
        city: acct.city,
        brandName,
        platform: "both",
        hint: assetPath?.split("/").pop(),
        tone: settings.default_brand_caption_tone || undefined,
      });

      const fb = await postToFacebook({
        pageId: acct.fb_page_id,
        accessToken: acct.fb_page_access_token,
        caption,
        media,
      });
      await db.from("social_posts").insert({
        city: acct.city,
        platform: "facebook",
        post_type: type,
        caption,
        asset_path: assetPath || null,
        asset_url: media.url || null,
        external_post_id: fb.id || null,
        status: fb.ok ? "posted" : "failed",
        error: fb.error || null,
      });
      summary.push({ city: acct.city, platform: "facebook", ok: fb.ok, error: fb.error });

      // IG only if media is present (it requires media)
      if (acct.ig_user_id && media.type !== "none") {
        const ig = await postToInstagram({
          igUserId: acct.ig_user_id,
          accessToken: acct.fb_page_access_token,
          caption,
          media,
        });
        await db.from("social_posts").insert({
          city: acct.city,
          platform: "instagram",
          post_type: type,
          caption,
          asset_path: assetPath || null,
          asset_url: media.url || null,
          external_post_id: ig.id || null,
          status: ig.ok ? "posted" : "failed",
          error: ig.error || null,
        });
        summary.push({ city: acct.city, platform: "instagram", ok: ig.ok, error: ig.error });
      }

      if (assetPath) usedPaths.add(assetPath);
    } catch (e: any) {
      summary.push({ city: acct.city, ok: false, error: e?.message || String(e) });
    }
  }

  return NextResponse.json({ ok: true, type, summary });
}
