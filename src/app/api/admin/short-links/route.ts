import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("short_links")
    .select("id, slug, destination_url, label, clicks, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data || [] });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { destinationUrl, slug: requestedSlug, label } = await req.json();

  if (!destinationUrl?.trim()) return NextResponse.json({ error: "Destination URL is required" }, { status: 400 });
  let normalizedUrl = destinationUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
  try { new URL(normalizedUrl); } catch { return NextResponse.json({ error: "Not a valid URL" }, { status: 400 }); }

  const db = supabaseAdmin as any;
  let slug = requestedSlug?.trim() ? slugify(requestedSlug) : crypto.randomBytes(4).toString("hex");
  if (!slug) return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });

  const { data: existing } = await db.from("short_links").select("id").eq("slug", slug).maybeSingle();
  if (existing) return NextResponse.json({ error: `"${slug}" is already taken — try a different one` }, { status: 409 });

  const { data, error } = await db
    .from("short_links")
    .insert({ slug, destination_url: normalizedUrl, label: label?.trim() || null })
    .select("id, slug, destination_url, label, clicks, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ link: data });
}
