import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** The logged-in Auth user for this request, or null. Per-request client, never shared (see CLAUDE.md RLS section). */
export async function sessionUser(req: NextRequest) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
