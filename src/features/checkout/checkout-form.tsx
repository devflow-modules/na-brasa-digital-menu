"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FunnelCheckoutStartedTracker } from "@/features/analytics/components/funnel-checkout-started-tracker";
import { trackClientFunnelEvent } from "@/features/analytics/track-client-funnel-event";
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
import { getCheckoutEstimatedTotalCents } from "@/features/checkout/get-checkout-estimated-total-cents";
import {
  isOnlineCheckoutAvailable,
  resolveDefaultCheckoutDeliveryType,
  type CheckoutDeliveryType,
} from "@/features/checkout/resolve-default-checkout-delivery-type";
import type { CheckoutStoreInfo } from "@/features/checkout/types";
import { formatMoney } from "@/features/menu/format-money";
import { createOrderAction } from "@/features/orders/actions/create-order-action";
import { isBelowDeliveryMinimumOrder } from "@/features/orders/utils/delivery-minimum-order";
import {
  clearCheckoutIdempotencyAttempt,
  resolveCheckoutIdempotencyKey,
} from "@/features/checkout/checkout-idempotency-session";

type CheckoutFormProps = {
  store: CheckoutStoreInfo;
};

function CheckoutShell({
  store,
  children,
}: {
  store: CheckoutStoreInfo;
  children: React.ReactNode;
}) {
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
      {children}
    </div>
  );
}

function StoreClosedBanner() {
  return (
    <p
      data-testid="checkout-store-closed-banner"
      className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-50"
      role="alert"
    >
      <span className="font-semibold">A loja está fechada no momento.</span> Você
      pode voltar ao cardápio, mas não é possível enviar pedidos Online agora.
    </p>
  );
}

function OnlineUnavailableNotice({ showClosedBanner }: { showClosedBanner: boolean }) {
  return (
    <>
      {showClosedBanner ? <StoreClosedBanner /> : null}
      <p
        data-testid="checkout-online-unavailable"
        role="alert"
        className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-50"
      >
        <span className="font-semibold">
          Pedidos Online estão temporariamente indisponíveis.
        </span>{" "}
        Entre em contato com a loja para mais informações.
      </p>
      <p className="text-sm text-stone-400">
        O cardápio continua visível. Não é possível finalizar pedidos Online
        enquanto retirada e entrega estiverem desabilitadas.
      </p>
    </>
  );
}

type AvailableCheckoutFormProps = {
  store: CheckoutStoreInfo;
  defaultDeliveryType: CheckoutDeliveryType;
};

function AvailableCheckoutForm({
  store,
  defaultDeliveryType,
}: AvailableCheckoutFormProps) {
  const { cart, hydrated, clearCart } = useCart();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [whatsappFallbackUrl, setWhatsappFallbackUrl] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

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
  const estimatedTotalCents = getCheckoutEstimatedTotalCents({
    subtotalCents: cart.subtotalCents,
    deliveryFeeCents: store.deliveryFeeCents,
    showDeliveryFee,
  });

  const emptyCart = useMemo(
    () => hydrated && cart.items.length === 0 && !whatsappFallbackUrl,
    [cart.items.length, hydrated, whatsappFallbackUrl],
  );

  function onSubmit(values: CheckoutFormValues) {
    if (!store.isOpen) {
      return;
    }

    setErrorMessage(null);
    setWhatsappFallbackUrl(null);

    const changeFor =
      values.paymentMethod === "CASH" && values.needsChange
        ? values.changeFor
        : undefined;

    startTransition(async () => {
      const idempotencyKey = resolveCheckoutIdempotencyKey(store.slug, {
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          addonIds: item.selectedAddons.map((addon) => addon.id),
        })),
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        deliveryType: values.deliveryType,
        deliveryAddress: values.deliveryAddress,
        paymentMethod: values.paymentMethod,
        changeFor,
        notes: values.notes,
      });

      const result = await createOrderAction({
        storeSlug: store.slug,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        deliveryType: values.deliveryType,
        deliveryAddress: values.deliveryAddress,
        paymentMethod: values.paymentMethod,
        changeFor,
        notes: values.notes,
        idempotencyKey,
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

      clearCheckoutIdempotencyAttempt(store.slug);
      clearCart();
      window.localStorage.removeItem(CART_STORAGE_KEY);
      setWhatsappFallbackUrl(result.whatsappUrl);
      trackClientFunnelEvent({
        storeSlug: store.slug,
        name: "whatsapp_handoff_started",
        orderId: result.orderId,
      });
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
    <CheckoutShell store={store}>
      <FunnelCheckoutStartedTracker storeSlug={store.slug} />
      {!store.isOpen ? <StoreClosedBanner /> : null}

      {cart.items.length > 0 ? (
        <CheckoutCartSummary
          cart={cart}
          deliveryFeeCents={store.deliveryFeeCents}
          showDeliveryFee={showDeliveryFee}
        />
      ) : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-0"
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
              className="scroll-mb-36 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 outline-none ring-orange-500/40 focus:ring-2 md:scroll-mb-0"
            />
            {errors.notes ? (
              <span className="text-xs text-red-400">{errors.notes.message}</span>
            ) : null}
          </label>
        </div>

        {cart.items.length > 0 &&
        isBelowDeliveryMinimumOrder({
          deliveryType,
          subtotalCents: cart.subtotalCents,
          minimumOrderAmountCents: store.minimumOrderAmountCents,
        }) ? (
          <p
            data-testid="checkout-minimum-order-warning"
            role="status"
            className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-100"
          >
            Pedido mínimo para entrega:{" "}
            {formatMoney(store.minimumOrderAmountCents)}. O valor será validado
            ao finalizar.
          </p>
        ) : null}

        {errorMessage ? (
          <p
            data-testid="checkout-error-message"
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

        <div
          data-testid="checkout-submit-bar"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-500/30 bg-stone-950/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md md:static md:z-auto md:mt-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none"
        >
          <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
            <div
              data-testid="checkout-mobile-sticky-summary"
              className="flex items-end justify-between gap-3 md:hidden"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
                  Total estimado
                </p>
                {showDeliveryFee ? (
                  <p className="text-xs text-stone-400">Inclui taxa de entrega</p>
                ) : null}
              </div>
              <p
                data-testid="checkout-sticky-total"
                className="shrink-0 text-xl font-bold tabular-nums text-orange-300"
              >
                {formatMoney(estimatedTotalCents)}
              </p>
            </div>

            <p className="hidden text-center text-xs leading-relaxed text-stone-500 md:block">
              Ao continuar, seu pedido será salvo e você será redirecionado para
              o WhatsApp.
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
        </div>
      </form>
    </CheckoutShell>
  );
}

export function CheckoutForm({ store }: CheckoutFormProps) {
  const { cart, hydrated } = useCart();
  const onlineAvailable = isOnlineCheckoutAvailable(store);
  const defaultDeliveryType = resolveDefaultCheckoutDeliveryType(store);

  if (!hydrated) {
    return (
      <p className="px-4 py-10 text-center text-sm text-stone-400">
        Carregando checkout...
      </p>
    );
  }

  if (!onlineAvailable || !defaultDeliveryType) {
    return (
      <CheckoutShell store={store}>
        <OnlineUnavailableNotice showClosedBanner={!store.isOpen} />
        {cart.items.length > 0 ? (
          <CheckoutCartSummary
            cart={cart}
            deliveryFeeCents={store.deliveryFeeCents}
            showDeliveryFee={false}
          />
        ) : null}
      </CheckoutShell>
    );
  }

  return (
    <AvailableCheckoutForm
      store={store}
      defaultDeliveryType={defaultDeliveryType}
    />
  );
}
