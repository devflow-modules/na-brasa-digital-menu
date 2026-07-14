import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";
import type {
  AdminSessionPayload,
  AuthenticatedAdminUser,
} from "@/features/admin/auth/types";

const SESSION_DURATION = "8h";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const USER_ROLES = new Set<UserRole>([
  "MASTER",
  "STORE_OWNER",
  "MANAGER",
  "OPERATOR",
  "KITCHEN",
]);

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

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.has(value as UserRole);
}

export async function signAdminToken(
  user: AuthenticatedAdminUser,
): Promise<string> {
  return new SignJWT({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .setSubject(user.id)
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
      typeof payload.userId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !isUserRole(payload.role) ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    let storeId: string | null;
    if (payload.storeId === undefined || payload.storeId === null) {
      storeId = null;
    } else if (typeof payload.storeId === "string") {
      storeId = payload.storeId;
    } else {
      return null;
    }

    return {
      userId: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      storeId,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
