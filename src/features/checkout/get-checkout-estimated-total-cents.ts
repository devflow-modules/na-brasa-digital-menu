/** Client-side estimate only — server recalculates on submit. */
export function getCheckoutEstimatedTotalCents(input: {
  subtotalCents: number;
  deliveryFeeCents: number;
  showDeliveryFee: boolean;
}): number {
  return (
    input.subtotalCents +
    (input.showDeliveryFee ? input.deliveryFeeCents : 0)
  );
}
