import { NextRequest, NextResponse } from "next/server";

// Same in-memory store — in production this hits the DB
// We import from the forgot-password route via a shared module
// For now, just validates format and returns success (real update happens when backend is live)
export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // TODO: verify token against DB, update customer password hash
  // For now: token presence = valid (in-memory tokens from forgot-password route)
  return NextResponse.json({ success: true });
}
