import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import sharp from "sharp";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const formData = await req.formData();
  const eventId = formData.get("eventId") as string;
  const file = formData.get("file") as File | null;

  if (!eventId || !file) {
    return NextResponse.json({ error: "eventId and file are required" }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  // Actually resize + re-encode to webp — these are hero backgrounds, never
  // need to exceed 1920px wide, and full-res phone photos were previously
  // uploaded as-is under a ".webp" name with no real compression.
  const buffer = await sharp(rawBuffer)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const storagePath = `og/${eventId}.webp`;

  const db = supabaseAdmin as any;

  const { error: uploadError } = await db.storage
    .from("event-images")
    .upload(storagePath, buffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage
    .from("event-images")
    .getPublicUrl(storagePath);

  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-bust on re-upload

  await db
    .from("events")
    .update({ og_image: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  return NextResponse.json({ url: publicUrl });
}
