import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db.from("social_accounts").select("*").order("city");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Mask token for UI
  const masked = (data || []).map((r: any) => ({
    ...r,
    fb_page_access_token: r.fb_page_access_token ? `${String(r.fb_page_access_token).slice(0, 6)}…${String(r.fb_page_access_token).slice(-4)}` : "",
  }));
  return NextResponse.json({ accounts: masked });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const body = await req.json();
  const { city, fb_page_id, fb_page_name, fb_page_access_token, ig_user_id, dropbox_city_folder, enabled } = body;
  if (!city || !fb_page_id || !fb_page_access_token) {
    return NextResponse.json({ error: "city, fb_page_id, fb_page_access_token are required" }, { status: 400 });
  }
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("social_accounts")
    .upsert(
      {
        city,
        fb_page_id,
        fb_page_name: fb_page_name || null,
        fb_page_access_token,
        ig_user_id: ig_user_id || null,
        dropbox_city_folder: dropbox_city_folder || null,
        enabled: enabled !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "city" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = supabaseAdmin as any;
  const { error } = await db.from("social_accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
