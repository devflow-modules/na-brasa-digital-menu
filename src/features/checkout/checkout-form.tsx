"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CART_STORAGE_KEY, useCart } from "@/features/cart/use-cart";
import {
  checkoutFormDefaultValues,
  checkoutFormSchema,
  type CheckoutFormValues,
} from "@/features/checkout/checkout-schema";
import { CheckoutCartSummary } from "@/features/checkout/components/checkout-cart-summary";
import { CustomerFields } from "@/features/checkout/components/customer-fields";
import { DeliveryAddressFields } from "@/features/checkout/components/delivery-address-fields";
import { DeliveryTypeField } from "@/features/checkout/components/delivery-type-field";
import { PaymentMethodField } from "@/features/checkout/components/payment-method-field";
import type { CheckoutStoreInfo } from "@/features/checkout/types";
import { createOrderAction } from "@/features/orders/actions/create-order-action";

type CheckoutFormProps = {
  store: CheckoutStoreInfo;
};

export function CheckoutForm({ store }: CheckoutFormProps) {
  const { cart, hydrated, clearCart } = useCart();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [whatsappFallbackUrl, setWhatsappFallbackUrl] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const defaultDeliveryType = store.pickupEnabled
    ? "PICKUP"
    : store.deliveryEnabled
      ? "DELIVERY"
      : "PICKUP";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      ...checkoutFormDefaultValues,
      deliveryType: defaultDeliveryType,
    },
  });

  const deliveryType = watch("deliveryType");
  const showDeliveryFee = deliveryType === "DELIVERY" && store.deliveryEnabled;

  const emptyCart = useMemo(
    () => hydrated && cart.items.length === 0 && !whatsappFallbackUrl,
    [cart.items.length, hydrated, whatsappFallbackUrl],
  );

  function onSubmit(values: CheckoutFormValues) {
    setErrorMessage(null);
    setWhatsappFallbackUrl(null);

    const changeFor =
      values.paymentMethod === "CASH" && values.needsChange
        ? values.changeFor
        : undefined;

    startTransition(async () => {
      const result = await createOrderAction({
        storeSlug: store.slug,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        deliveryType: values.deliveryType,
        deliveryAddress: values.deliveryAddress,
        paymentMethod: values.paymentMethod,
        changeFor,
        notes: values.notes,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          addonIds: item.selectedAddons.map((addon) => addon.id),
        })),
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      clearCart();
      window.localStorage.removeItem(CART_STORAGE_KEY);
      setWhatsappFallbackUrl(result.whatsappUrl);
      window.location.href = result.whatsappUrl;
    });
  }

  if (!hydrated) {
    return (
      <p className="px-4 py-10 text-center text-sm text-stone-400">
        Carregando checkout...
      </p>
    );
  }

  if (emptyCart) {
    return (
      <div
        data-testid="checkout-empty-cart"
        className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center"
      >
        <p className="text-lg font-medium text-stone-200">
          Seu carrinho está vazio
        </p>
        <p className="text-sm text-stone-400">
          Volte ao cardápio e adicione itens antes de finalizar pelo WhatsApp.
        </p>
        <Link
          href="/na-brasa"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-stone-950"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300/90">
            Checkout
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-orange-50">
            {store.name}
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Último passo antes do WhatsApp
          </p>
        </div>
        <Link
          href="/na-brasa"
          data-testid="checkout-back-to-menu"
          className="shrink-0 text-sm font-medium text-orange-200 underline-offset-2 hover:text-orange-100 hover:underline"
        >
          ← Voltar ao cardápio
        </Link>
      </header>

      {!store.isOpen ? (
        <p
          data-testid="checkout-store-closed-banner"
          className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-50"
          role="alert"
        >
          <span className="font-semibold">A loja está fechada no momento.</span>{" "}
          Você pode voltar ao cardápio, mas não é possível enviar pedidos agora.
        </p>
      ) : null}

      {cart.items.length > 0 ? (
        <CheckoutCartSummary
          cart={cart}
          deliveryFeeCents={store.deliveryFeeCents}
          showDeliveryFee={showDeliveryFee}
        />
      ) : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <CustomerFields register={register} errors={errors} />

        <DeliveryTypeField
          register={register}
          errors={errors}
          watch={watch}
          pickupEnabled={store.pickupEnabled}
          deliveryEnabled={store.deliveryEnabled}
          deliveryFeeCents={store.deliveryFeeCents}
        />

        <DeliveryAddressFields
          register={register}
          errors={errors}
          watch={watch}
        />

        <PaymentMethodField
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />

        <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
          <label className="flex flex-col gap-1.5 text-sm text-stone-300">
            Observações do pedido
            <textarea
              rows={3}
              placeholder="Exemplo: sem cebola, ponto da carne, referência para entrega."
              {...register("notes")}
              className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
            />
            {errors.notes ? (
              <span className="text-xs text-red-400">{errors.notes.message}</span>
            ) : null}
          </label>
        </div>

        {store.minimumOrderAmountCents > 0 &&
        cart.items.length > 0 &&
        cart.subtotalCents < store.minimumOrderAmountCents ? (
          <p className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-100">
            Pedido mínimo estimado: o valor será validado ao finalizar.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-center text-xs leading-relaxed text-stone-500">
            Ao continuar, seu pedido será salvo e você será redirecionado para o
            WhatsApp.
          </p>
          <button
            type="submit"
            data-testid="checkout-submit-button"
            disabled={isPending || cart.items.length === 0 || !store.isOpen}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-stone-950 shadow-md shadow-orange-950/30 ring-1 ring-orange-400/25 disabled:opacity-60"
          >
            {isPending ? "Enviando pedido..." : "Enviar pedido pelo WhatsApp"}
          </button>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100"
          >
            {errorMessage}
          </p>
        ) : null}

        {whatsappFallbackUrl ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100"
          >
            Pedido criado. Se o WhatsApp não abrir,{" "}
            <a
              href={whatsappFallbackUrl}
              className="font-semibold underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              toque aqui para abrir a conversa
            </a>
            .
          </p>
        ) : null}
      </form>
    </div>
  );
}
