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
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-base text-stone-200">Seu carrinho está vazio.</p>
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-300/80">
            Checkout
          </p>
          <h1 className="text-2xl font-semibold text-orange-50">{store.name}</h1>
        </div>
        <Link
          href="/na-brasa"
          className="text-sm font-medium text-stone-300 underline-offset-2 hover:text-orange-300 hover:underline"
        >
          Voltar
        </Link>
      </div>

      {!store.isOpen ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          A loja está fechada no momento. Você ainda pode preparar o pedido.
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
        className="flex flex-col gap-6"
        noValidate
      >
        <CustomerFields register={register} errors={errors} />

        <DeliveryTypeField
          register={register}
          errors={errors}
          watch={watch}
          pickupEnabled={store.pickupEnabled}
          deliveryEnabled={store.deliveryEnabled}
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

        <label className="flex flex-col gap-1.5 text-sm text-stone-300">
          Observações
          <textarea
            rows={3}
            placeholder="Sem cebola, ponto de referência, etc."
            {...register("notes")}
            className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
          />
          {errors.notes ? (
            <span className="text-xs text-red-400">{errors.notes.message}</span>
          ) : null}
        </label>

        {store.minimumOrderAmountCents > 0 &&
        cart.items.length > 0 &&
        cart.subtotalCents < store.minimumOrderAmountCents ? (
          <p className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-100">
            Pedido mínimo estimado: o valor será validado ao finalizar.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || cart.items.length === 0}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
        >
          {isPending
            ? "Finalizando pedido..."
            : "Finalizar pedido no WhatsApp"}
        </button>

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
