// Minimal Dropbox API client (OAuth2 refresh-token flow).
// Env: DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const key = process.env.DROPBOX_APP_KEY;
  const secret = process.env.DROPBOX_APP_SECRET;
  const refresh = process.env.DROPBOX_REFRESH_TOKEN;
  if (!key || !secret || !refresh) {
    throw new Error("Dropbox env vars missing (DROPBOX_APP_KEY/APP_SECRET/REFRESH_TOKEN)");
  }
  const res = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || "Dropbox token refresh failed");
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in || 14400) * 1000 };
  return cachedToken.value;
}

async function dbxRpc(endpoint: string, body: any): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json.error_summary || `Dropbox ${endpoint} ${res.status}`);
  return json;
}

export type DropboxFile = {
  path: string;
  name: string;
  size: number;
  isImage: boolean;
  isVideo: boolean;
};

const IMG_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const VID_EXT = [".mp4", ".mov", ".m4v"];

function classify(name: string) {
  const lower = name.toLowerCase();
  return {
    isImage: IMG_EXT.some(e => lower.endsWith(e)),
    isVideo: VID_EXT.some(e => lower.endsWith(e)),
  };
}

export async function listFolder(folderPath: string): Promise<DropboxFile[]> {
  const normalized = folderPath === "/" ? "" : folderPath.replace(/\/$/, "");
  const out: DropboxFile[] = [];
  let res = await dbxRpc("files/list_folder", {
    path: normalized,
    recursive: false,
    include_media_info: false,
    limit: 2000,
  });
  for (;;) {
    for (const e of res.entries || []) {
      if (e[".tag"] !== "file") continue;
      const k = classify(e.name);
      if (!k.isImage && !k.isVideo) continue;
      out.push({ path: e.path_lower, name: e.name, size: e.size, ...k });
    }
    if (!res.has_more) break;
    res = await dbxRpc("files/list_folder/continue", { cursor: res.cursor });
  }
  return out;
}

// Returns a 4-hour direct download URL that Meta can fetch.
export async function getTemporaryLink(path: string): Promise<string> {
  const res = await dbxRpc("files/get_temporary_link", { path });
  return res.link;
}

export async function listFolders(parentPath: string): Promise<string[]> {
  const normalized = parentPath === "/" ? "" : parentPath.replace(/\/$/, "");
  try {
    const res = await dbxRpc("files/list_folder", { path: normalized, limit: 2000 });
    return (res.entries || [])
      .filter((e: any) => e[".tag"] === "folder")
      .map((e: any) => e.path_lower as string);
  } catch {
    return [];
  }
}

export function isConfigured() {
  return Boolean(process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET && process.env.DROPBOX_REFRESH_TOKEN);
}
