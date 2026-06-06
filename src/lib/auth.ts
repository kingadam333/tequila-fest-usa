/**
 * Auth helpers for server-side session management using Supabase Auth
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component — cookies set in middleware */ }
        },
      },
    }
  );
}

export async function getSession() {
  const client = await createAuthClient();
  const { data: { session } } = await client.auth.getSession();
  return session;
}

export async function getUser() {
  const client = await createAuthClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}
