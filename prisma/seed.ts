import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { applyNaBrazaPilotMenu } from "./na-braza-pilot-menu";

const prisma = new PrismaClient();

const STORE_SLUG = "na-brasa";
/** Official Na Braza orders WhatsApp (digits with country code 55). */
const NA_BRAZA_WHATSAPP = "5513981091971";
const LEGACY_WHATSAPP_PLACEHOLDER = "5513999999999";
const BCRYPT_ROUNDS = 10;

/**
 * Bootstrap Store only — never overwrites operational fields on an existing row.
 */
async function ensureStore() {
  const existing = await prisma.store.findUnique({
    where: { slug: STORE_SLUG },
  });

  if (existing) {
    console.log(
      `[seed] Store "${STORE_SLUG}" already exists — preserving operational data (whatsapp, address, fees, hours, flags).`,
    );
    return { store: existing, created: false };
  }

  const store = await prisma.store.create({
    data: {
      name: "Na Braza",
      slug: STORE_SLUG,
      description:
        "Carrinho de lanches artesanais e espetinhos feitos na brasa.",
      whatsapp: NA_BRAZA_WHATSAPP,
      address: "Barão de Ramalho, 155 — Macuco — Santos/SP",
      openingHours:
        "Segunda a domingo, das 17h30 às 00h. O funcionamento pode variar em dias de chuva forte.",
      isOpen: true,
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryFeeCents: 600,
      minimumOrderAmountCents: 3000,
    },
  });

  console.log(
    `[seed] Store "${STORE_SLUG}" created with Na Braza pilot store settings (see docs/client/na-braza-pilot-data.md).`,
  );
  return { store, created: true };
}

/**
 * Optional, idempotent MASTER user bootstrap (ADR 0002).
 */
async function upsertMasterUser(): Promise<{ seeded: boolean; email?: string }> {
  const name = process.env.MASTER_ADMIN_NAME?.trim();
  const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_ADMIN_PASSWORD;

  const missing: string[] = [];
  if (!name) missing.push("MASTER_ADMIN_NAME");
  if (!email) missing.push("MASTER_ADMIN_EMAIL");
  if (!password) missing.push("MASTER_ADMIN_PASSWORD");

  if (missing.length > 0) {
    console.warn(
      `[seed] Skipping MASTER user bootstrap — missing env(s): ${missing.join(", ")}. Catalog seed continues.`,
    );
    return { seeded: false };
  }

  const passwordHash = await bcrypt.hash(password!, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: email! },
    create: {
      name: name!,
      email: email!,
      passwordHash,
      role: UserRole.MASTER,
      storeId: null,
      isActive: true,
    },
    update: {
      name: name!,
      passwordHash,
      role: UserRole.MASTER,
      storeId: null,
      isActive: true,
    },
    select: { email: true, role: true },
  });

  console.log(`[seed] MASTER user upserted (email set, password not logged).`);
  return { seeded: true, email: user.email };
}

async function main() {
  console.log("Seeding Na Braza (idempotent, production-safe bootstrap)...");

  const master = await upsertMasterUser();
  const { store, created: storeCreated } = await ensureStore();
  const menuSummary = await applyNaBrazaPilotMenu(prisma, store.id);

  const summary = {
    store: store.slug,
    storeCreated,
    storeDataPreserved: !storeCreated,
    whatsappIsLegacyPlaceholder: store.whatsapp === LEGACY_WHATSAPP_PLACEHOLDER,
    masterUserSeeded: master.seeded,
    pilotMenu: menuSummary,
    categories: await prisma.category.count({ where: { storeId: store.id } }),
    products: await prisma.product.count({ where: { storeId: store.id } }),
    addons: await prisma.addon.count({ where: { storeId: store.id } }),
    productAddons: await prisma.productAddon.count({
      where: { product: { storeId: store.id } },
    }),
    orders: await prisma.order.count({ where: { storeId: store.id } }),
    users: await prisma.user.count(),
  };

  console.log("Seed completed:", summary);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
