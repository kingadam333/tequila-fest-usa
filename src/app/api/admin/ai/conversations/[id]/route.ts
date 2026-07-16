import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;

  const { data: messages, error } = await db
    .from("admin_ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: messages || [] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;
  const { error } = await db.from("admin_ai_conversations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
