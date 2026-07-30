import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const db = supabaseAdmin as any;
  const { error } = await db.from("short_links").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Editable in place — same slug's QR code image keeps working (the qrserver
// image URL is derived from the slug, not the row id), so renaming or
// re-pointing an existing link doesn't invalidate any already-printed code
// unless the admin explicitly changes the slug too.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  const { id } = await params;
  const { destinationUrl, slug: requestedSlug, label } = await req.json();

  const db = supabaseAdmin as any;
  const updates: Record<string, unknown> = {};

  if (label !== undefined) updates.label = label?.trim() || null;

  if (destinationUrl !== undefined) {
    if (!destinationUrl?.trim()) return NextResponse.json({ error: "Destination URL is required" }, { status: 400 });
    let normalizedUrl = destinationUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
    try { new URL(normalizedUrl); } catch { return NextResponse.json({ error: "Not a valid URL" }, { status: 400 }); }
    updates.destination_url = normalizedUrl;
  }

  if (requestedSlug !== undefined && requestedSlug.trim()) {
    const slug = slugify(requestedSlug);
    if (!slug) return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });
    const { data: existing } = await db.from("short_links").select("id").eq("slug", slug).neq("id", id).maybeSingle();
    if (existing) return NextResponse.json({ error: `"${slug}" is already taken — try a different one` }, { status: 409 });
    updates.slug = slug;
  }

  const { data, error } = await db
    .from("short_links")
    .update(updates)
    .eq("id", id)
    .select("id, slug, destination_url, label, clicks, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ link: data });
}
