import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const config = { api: { bodyParser: false } };

// Same upload pattern as the load-in venue map upload — Supabase Storage,
// public URL saved to the single invoice_payment_settings row.
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const storagePath = `invoice-payment/zelle-qr.${ext}`;

  const db = supabaseAdmin as any;
  const { error: uploadError } = await db.storage
    .from("event-images")
    .upload(storagePath, buffer, { contentType: file.type || "image/png", upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = db.storage.from("event-images").getPublicUrl(storagePath);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { data: existing } = await db.from("invoice_payment_settings").select("id").limit(1).maybeSingle();
  const { error } = existing
    ? await db.from("invoice_payment_settings").update({ zelle_qr_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq("id", existing.id)
    : await db.from("invoice_payment_settings").insert({ zelle_qr_url: urlData.publicUrl });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl });
}
