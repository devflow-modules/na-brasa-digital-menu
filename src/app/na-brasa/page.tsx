import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicMenuPage } from "@/features/menu/public-menu-page";
import { getPublicMenuBySlug } from "@/features/menu/menu.repository";

const STORE_SLUG = "na-brasa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Na Braza — Cardápio Online",
  description:
    "Lanches artesanais e espetinhos feitos na brasa. Peça direto pelo cardápio online.",
};

export default async function NaBrasaPage() {
  const menu = await getPublicMenuBySlug(STORE_SLUG);

  if (!menu) {
    notFound();
  }

  return <PublicMenuPage menu={menu} />;
}
