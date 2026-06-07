import { NextRequest } from "next/server";
import { verifyStaffToken } from "@/lib/staffAuth";

/**
 * Verifies a check-in request — accepts either:
 * 1. Admin password (x-checkin-token: <ADMIN_PASSWORD>)
 * 2. Staff JWT with 'checkin' permission (x-checkin-token: Bearer <jwt>)
 */
export async function verifyCheckinAccess(req: NextRequest): Promise<boolean> {
  const token = req.headers.get("x-checkin-token") || "";
  if (!token) return false;

  // Admin password shortcut
  if (token === process.env.ADMIN_PASSWORD) return true;

  // Staff JWT
  if (token.startsWith("Bearer ")) {
    const jwt = token.slice(7);
    const payload = await verifyStaffToken(jwt);
    if (!payload) return false;
    return payload.permissions.includes("checkin") || payload.permissions.includes("all");
  }

  return false;
}
