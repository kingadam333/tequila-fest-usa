import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.MEDIA_JWT_SECRET || process.env.ADMIN_PASSWORD || "tequila-media-secret"
);

export interface MediaPayload {
  mediaPartnerId: string;
  email: string;
  companyName: string;
}

export async function signMediaToken(payload: MediaPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function verifyMediaToken(token: string): Promise<MediaPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as MediaPayload;
  } catch {
    return null;
  }
}

// Pulls the Bearer token from an incoming request and verifies it —
// mirrors verifyCheckinAccess()'s header convention for consistency.
export async function verifyMediaAccess(req: NextRequest): Promise<MediaPayload | null> {
  const header = req.headers.get("x-media-token") || req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  return verifyMediaToken(token);
}
