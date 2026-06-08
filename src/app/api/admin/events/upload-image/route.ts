import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const formData = await req.formData();
  const eventId = formData.get("eventId") as string;
  const file = formData.get("file") as File | null;

  if (!eventId || !file) {
    return NextResponse.json({ error: "eventId and file are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Always store as webp for optimal size/quality
  const storagePath = `og/${eventId}.webp`;

  const db = supabaseAdmin as any;

  const { error: uploadError } = await db.storage
    .from("event-images")
    .upload(storagePath, buffer, {
      contentType: file.type || "image/webp",
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
