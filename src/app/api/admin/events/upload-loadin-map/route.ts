import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const config = { api: { bodyParser: false } };

// Uploaded as-is (no resize/re-encode like the OG hero image pipeline) —
// venue maps often have small labels/text that compression would blur.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const formData = await req.formData();
  const eventId = formData.get("eventId") as string;
  const file = formData.get("file") as File | null;
  const slot = (formData.get("slot") as string) === "2" ? "2" : "1";
  const column = slot === "2" ? "load_in_map_url_2" : "load_in_map_url";

  if (!eventId || !file) {
    return NextResponse.json({ error: "eventId and file are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const storagePath = `loadin/${eventId}${slot === "2" ? "-2" : ""}.${ext}`;

  const db = supabaseAdmin as any;

  const { error: uploadError } = await db.storage
    .from("event-images")
    .upload(storagePath, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from("event-images").getPublicUrl(storagePath);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await db
    .from("events")
    .update({ [column]: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  return NextResponse.json({ url: publicUrl });
}
