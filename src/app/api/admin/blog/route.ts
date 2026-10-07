import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBlogInput } from "@/lib/blogAdmin";

// Admin: list every post (drafts included) / create one.
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("blog_posts").select("*").order("published_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data || [] });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const parsed = parseBlogInput(await req.json().catch(() => null), { partial: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("blog_posts").insert(parsed.values).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Another post already uses that URL slug" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data });
}
