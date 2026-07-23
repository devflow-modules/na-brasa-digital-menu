import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { withSessionVersionBump } from "@/features/admin/auth/user-session-version";

const STORE_SLUG = "na-brasa";
const OWNER_NAME = "Lucas Araújo";
const OWNER_EMAIL = "theluksvm@gmail.com";
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;

function requireOwnerPassword(): string {
  const raw = process.env.NA_BRAZA_LUCAS_PASSWORD;
  if (!raw) {
    throw new Error("NA_BRAZA_LUCAS_PASSWORD is required.");
  }
  if (raw !== raw.trim()) {
    throw new Error(
      "NA_BRAZA_LUCAS_PASSWORD must not have leading or trailing whitespace.",
    );
  }
  if (raw.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `NA_BRAZA_LUCAS_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  return raw;
}

async function main(): Promise<void> {
  const password = requireOwnerPassword();
  const prisma = new PrismaClient();

  try {
    const store = await prisma.store.findUnique({
      where: { slug: STORE_SLUG },
      select: { id: true, slug: true },
    });

    if (!store) {
      throw new Error(
        `Store with slug "${STORE_SLUG}" not found. Create the store first.`,
      );
    }

    const email = OWNER_EMAIL.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        name: OWNER_NAME,
        email,
        passwordHash,
        role: UserRole.STORE_OWNER,
        storeId: store.id,
        isActive: true,
      },
      update: withSessionVersionBump({
        name: OWNER_NAME,
        passwordHash,
        role: UserRole.STORE_OWNER,
        storeId: store.id,
        isActive: true,
      }),
      select: { id: true, email: true, role: true },
    });

    console.log(`User id: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Store slug: ${store.slug}`);
    console.log(existing ? "Action: updated" : "Action: created");
    console.log("Na Braza store owner access ready.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
