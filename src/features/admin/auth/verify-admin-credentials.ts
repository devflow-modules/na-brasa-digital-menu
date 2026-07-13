import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function verifyAdminCredentials(
  email: string,
  password: string,
): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim() ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedEmail || !expectedPassword) {
    return false;
  }

  const emailMatches = safeEqual(
    email.trim().toLowerCase(),
    expectedEmail.toLowerCase(),
  );
  const passwordMatches = safeEqual(password, expectedPassword);

  return emailMatches && passwordMatches;
}
