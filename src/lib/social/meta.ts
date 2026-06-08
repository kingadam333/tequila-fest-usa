// Meta (Facebook + Instagram) Graph API client.
// All calls use a per-Page long-lived access token stored in social_accounts.

const GRAPH = "https://graph.facebook.com/v21.0";

export type PostMedia = { type: "image" | "video" | "none"; url?: string };

export type PostResult = {
  platform: "facebook" | "instagram";
  ok: boolean;
  id?: string;
  error?: string;
};

async function gpost(path: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}/${path}`, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph POST ${path} failed (${res.status})`);
  }
  return json;
}

async function gget(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph GET ${path} failed (${res.status})`);
  }
  return json;
}

// ─── Facebook Page ──────────────────────────────────────────────────────────
export async function postToFacebook(opts: {
  pageId: string;
  accessToken: string;
  caption: string;
  media: PostMedia;
}): Promise<PostResult> {
  try {
    const { pageId, accessToken, caption, media } = opts;
    let resp: any;
    if (media.type === "image" && media.url) {
      resp = await gpost(`${pageId}/photos`, { url: media.url, caption, access_token: accessToken });
    } else if (media.type === "video" && media.url) {
      resp = await gpost(`${pageId}/videos`, { file_url: media.url, description: caption, access_token: accessToken });
    } else {
      resp = await gpost(`${pageId}/feed`, { message: caption, access_token: accessToken });
    }
    return { platform: "facebook", ok: true, id: resp.id || resp.post_id };
  } catch (e: any) {
    return { platform: "facebook", ok: false, error: e?.message || String(e) };
  }
}

// ─── Instagram (Business) ───────────────────────────────────────────────────
export async function postToInstagram(opts: {
  igUserId: string;
  accessToken: string;
  caption: string;
  media: PostMedia;
}): Promise<PostResult> {
  try {
    const { igUserId, accessToken, caption, media } = opts;
    if (media.type === "none" || !media.url) {
      return { platform: "instagram", ok: false, error: "Instagram requires an image or video." };
    }
    const createParams: Record<string, string> = {
      caption,
      access_token: accessToken,
    };
    if (media.type === "image") {
      createParams.image_url = media.url;
    } else {
      createParams.media_type = "REELS";
      createParams.video_url = media.url;
    }
    const created = await gpost(`${igUserId}/media`, createParams);
    const creationId = created.id;

    // Videos need a moment to finish ingestion before publish
    if (media.type === "video") {
      await pollIgMediaReady(creationId, accessToken);
    }

    const published = await gpost(`${igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
    return { platform: "instagram", ok: true, id: published.id };
  } catch (e: any) {
    return { platform: "instagram", ok: false, error: e?.message || String(e) };
  }
}

async function pollIgMediaReady(creationId: string, accessToken: string, maxMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const status = await gget(creationId, { fields: "status_code", access_token: accessToken });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`IG media ingestion ${status.status_code}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error("IG media ingestion timed out");
}

// Verify a token & list managed pages — used by admin "Connect" helper
export async function listManagedPages(userAccessToken: string) {
  const res = await gget("me/accounts", {
    fields: "id,name,access_token,instagram_business_account",
    access_token: userAccessToken,
  });
  return (res.data || []) as Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
}
