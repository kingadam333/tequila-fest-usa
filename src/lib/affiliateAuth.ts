import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.AFFILIATE_JWT_SECRET || process.env.ADMIN_PASSWORD || "tequila-affiliate-secret"
);

export interface AffiliatePayload {
  affiliateId: string;
  email: string;
  name: string;
}

export async function signAffiliateToken(payload: AffiliatePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyAffiliateToken(token: string): Promise<AffiliatePayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AffiliatePayload;
  } catch {
    return null;
  }
}

// Mirrors verifyMediaAccess()'s header convention for consistency.
export async function verifyAffiliateAccess(req: NextRequest): Promise<AffiliatePayload | null> {
  const header = req.headers.get("x-affiliate-token") || req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  return verifyAffiliateToken(token);
}
