import { PrismaClient } from "@prisma/client";

const STORE_SLUG = "na-brasa";

const NA_BRAZA_STORE_SETTINGS = {
  name: "Na Braza",
  whatsapp: "5513981091971",
  address: "Barão de Ramalho, 155 — Macuco — Santos/SP",
  openingHours:
    "Segunda a domingo, das 17h30 às 00h. O funcionamento pode variar em dias de chuva forte.",
  deliveryFeeCents: 600,
  minimumOrderAmountCents: 3000,
  pickupEnabled: true,
  deliveryEnabled: true,
  isOpen: true,
} as const;

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.store.findUnique({
      where: { slug: STORE_SLUG },
      select: { id: true, slug: true, name: true },
    });

    if (!existing) {
      throw new Error(
        `Store with slug "${STORE_SLUG}" not found. Create the store first (e.g. prisma db seed on a fresh database).`,
      );
    }

    const previousName = existing.name;

    const updated = await prisma.store.update({
      where: { slug: STORE_SLUG },
      data: { ...NA_BRAZA_STORE_SETTINGS },
      select: {
        id: true,
        slug: true,
        name: true,
        deliveryFeeCents: true,
        minimumOrderAmountCents: true,
        pickupEnabled: true,
        deliveryEnabled: true,
        isOpen: true,
      },
    });

    console.log(`Store id: ${updated.id}`);
    console.log(`Slug: ${updated.slug}`);
    console.log(`Name: ${previousName} → ${updated.name}`);
    console.log(
      "Updated: whatsapp, address, openingHours, deliveryFeeCents, minimumOrderAmountCents, pickupEnabled, deliveryEnabled, isOpen",
    );
    console.log(
      `Delivery fee (cents): ${updated.deliveryFeeCents}; minimum order (cents): ${updated.minimumOrderAmountCents}`,
    );
    console.log(
      `Pickup: ${updated.pickupEnabled}; delivery: ${updated.deliveryEnabled}; open: ${updated.isOpen}`,
    );
    console.log("Na Braza store settings applied.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
