import { NextRequest, NextResponse } from "next/server";

export function verifyAdminToken(req: NextRequest): boolean {
  const auth = req.headers.get("x-admin-token");
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return auth === password;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
