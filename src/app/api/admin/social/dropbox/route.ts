import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { listFolder, listFolders, isConfigured } from "@/lib/social/dropbox";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  if (!isConfigured()) {
    return NextResponse.json({ configured: false, files: [], folders: [] });
  }
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  const mode = searchParams.get("mode") || "files";
  try {
    if (mode === "folders") {
      const folders = await listFolders(path);
      return NextResponse.json({ configured: true, folders });
    }
    const files = await listFolder(path);
    return NextResponse.json({ configured: true, files });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: e?.message || String(e) }, { status: 500 });
  }
}
