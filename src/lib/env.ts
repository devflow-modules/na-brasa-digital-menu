import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_JWT_SECRET: z
    .string()
    .min(16, "ADMIN_JWT_SECRET must be at least 16 characters"),
  ADMIN_SESSION_COOKIE: z
    .string()
    .min(1, "ADMIN_SESSION_COOKIE is required")
    .default("na-brasa-admin-session"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_STORE_SLUG: z
    .string()
    .min(1, "NEXT_PUBLIC_STORE_SLUG is required"),
  // Deprecated: no longer used for /admin login runtime (database User instead).
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

export type Env = z.infer<typeof envSchema>;

function createEnv(): Env {
  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET,
    ADMIN_SESSION_COOKIE: process.env.ADMIN_SESSION_COOKIE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STORE_SLUG: process.env.NEXT_PUBLIC_STORE_SLUG,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || undefined,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || undefined,
  });

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

/**
 * Validated server/public env. Import only from server code or when vars are set.
 * Pages in this foundation PR do not import this module so `next build` can run
 * without a local `.env`.
 */
export const env = createEnv();
