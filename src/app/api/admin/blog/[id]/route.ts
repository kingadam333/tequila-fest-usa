import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBlogInput } from "@/lib/blogAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const parsed = parseBlogInput(await req.json().catch(() => null), { partial: true });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!Object.keys(parsed.values).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("blog_posts").update({ ...parsed.values, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Another post already uses that URL slug" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { error } = await db.from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
