import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/features/checkout/checkout-form";
import { getCheckoutStoreBySlug } from "@/features/checkout/checkout.repository";

const STORE_SLUG = "na-brasa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout — Na Brasa",
  description: "Informe seus dados para finalizar o pedido no Na Brasa.",
};

export default async function CheckoutPage() {
  const store = await getCheckoutStoreBySlug(STORE_SLUG);

  if (!store) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <CheckoutForm store={store} />
    </main>
  );
}
