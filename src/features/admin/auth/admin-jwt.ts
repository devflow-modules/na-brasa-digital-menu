import { SignJWT, jwtVerify } from "jose";
import type { AdminSessionPayload } from "@/features/admin/auth/types";

const SESSION_DURATION = "8h";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET is required");
  }

  return new TextEncoder().encode(secret);
}

export function getAdminSessionMaxAgeSeconds(): number {
  return SESSION_MAX_AGE_SECONDS;
}

export async function signAdminToken(
  email: string,
): Promise<string> {
  return new SignJWT({
    email,
    role: "ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getJwtSecret());
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.email !== "string" ||
      payload.role !== "ADMIN" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return {
      email: payload.email,
      role: "ADMIN",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
