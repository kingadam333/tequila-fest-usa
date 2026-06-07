import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.STAFF_JWT_SECRET || process.env.ADMIN_PASSWORD || "tequila-staff-secret"
);

export interface StaffPayload {
  staffId: string;
  email: string;
  name: string;
  permissions: string[];
}

export async function signStaffToken(payload: StaffPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function verifyStaffToken(token: string): Promise<StaffPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as StaffPayload;
  } catch {
    return null;
  }
}

export function hasPermission(permissions: string[], perm: string): boolean {
  return permissions.includes("all") || permissions.includes(perm);
}
