import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedAdminUser } from "@/features/admin/auth/types";

/** Generic message for any failed login (do not reveal if email exists). */
export const INVALID_CREDENTIALS_MESSAGE = "Credenciais inválidas.";

/** Valid bcrypt hash used only for constant-time-ish compare when user is missing. */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "__na_brasa_unused_dummy_password__",
  10,
);

/**
 * Authenticate against persisted User (email + bcrypt passwordHash).
 * Does not use ADMIN_EMAIL / ADMIN_PASSWORD.
 * Never logs password or passwordHash.
 */
export async function authenticateAdminUser(
  email: string,
  password: string,
): Promise<AuthenticatedAdminUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      storeId: true,
      isActive: true,
      passwordHash: true,
      sessionVersion: true,
    },
  });

  const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !user.isActive || !passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    sessionVersion: user.sessionVersion,
  };
}
