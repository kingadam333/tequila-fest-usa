import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data } = await db.from("knowledge_base").select("*").order("category").order("title");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { title, content, category } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Title and content required" }, { status: 400 });
  const db = supabaseAdmin as any;
  const { data, error } = await db.from("knowledge_base").insert({ title, content, category: category || "General" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
