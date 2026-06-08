import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { postToFacebook, postToInstagram, type PostMedia, type PostResult } from "@/lib/social/meta";
import { getTemporaryLink, isConfigured as dbxConfigured } from "@/lib/social/dropbox";

type Body = {
  city: string;
  platforms: ("facebook" | "instagram")[];
  caption: string;
  mediaType?: "image" | "video" | "none";
  mediaUrl?: string;        // direct public URL (overrides dropbox)
  dropboxPath?: string;     // path to fetch a temporary link for
  postType?: "event" | "brand" | "meme" | "manual";
};

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const body = (await req.json()) as Body;
  const { city, platforms, caption, mediaType = "none", mediaUrl, dropboxPath, postType = "manual" } = body;

  if (!city || !platforms?.length || !caption) {
    return NextResponse.json({ error: "city, platforms, caption are required" }, { status: 400 });
  }

  const db = supabaseAdmin as any;
  const { data: account, error: acctErr } = await db
    .from("social_accounts")
    .select("*")
    .eq("city", city)
    .single();
  if (acctErr || !account) {
    return NextResponse.json({ error: `No connected account for ${city}` }, { status: 400 });
  }

  // Resolve media URL
  let resolvedUrl: string | undefined = mediaUrl;
  if (!resolvedUrl && dropboxPath) {
    if (!dbxConfigured()) {
      return NextResponse.json({ error: "Dropbox not configured" }, { status: 400 });
    }
    try {
      resolvedUrl = await getTemporaryLink(dropboxPath);
    } catch (e: any) {
      return NextResponse.json({ error: `Dropbox: ${e?.message || e}` }, { status: 500 });
    }
  }

  const media: PostMedia = { type: mediaType, url: resolvedUrl };
  const results: PostResult[] = [];

  for (const platform of platforms) {
    let r: PostResult;
    if (platform === "facebook") {
      r = await postToFacebook({
        pageId: account.fb_page_id,
        accessToken: account.fb_page_access_token,
        caption,
        media,
      });
    } else {
      if (!account.ig_user_id) {
        r = { platform: "instagram", ok: false, error: "ig_user_id not set for this city" };
      } else {
        r = await postToInstagram({
          igUserId: account.ig_user_id,
          accessToken: account.fb_page_access_token,
          caption,
          media,
        });
      }
    }
    results.push(r);

    await db.from("social_posts").insert({
      city,
      platform,
      post_type: postType,
      caption,
      asset_path: dropboxPath || null,
      asset_url: resolvedUrl || null,
      external_post_id: r.id || null,
      status: r.ok ? "posted" : "failed",
      error: r.error || null,
      posted_at: new Date().toISOString(),
    });
  }

  const allOk = results.every(r => r.ok);
  return NextResponse.json({ ok: allOk, results });
}
