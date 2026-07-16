import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("admin_ai_conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data || [] });
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("admin_ai_conversations")
    .insert({ title: "New conversation" })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
