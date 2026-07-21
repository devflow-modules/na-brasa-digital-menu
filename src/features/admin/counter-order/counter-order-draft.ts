import type {
  CounterCatalogProduct,
  CounterDraftLine,
  CounterOrderSubmitPayload,
} from "@/features/admin/counter-order/counter-order.types";

export const COUNTER_ORDER_MAX_QUANTITY = 20;
export const COUNTER_ORDER_ITEM_NOTES_MAX = 200;
export const COUNTER_ORDER_CUSTOMER_LABEL_MAX = 80;

export function createDraftId(): string {
  return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function dedupeAddonIds(addonIds: string[]): string[] {
  return [...new Set(addonIds)];
}

export function buildDraftLine(input: {
  product: CounterCatalogProduct;
  quantity: number;
  addonIds: string[];
  notes?: string | null;
}): CounterDraftLine {
  const quantity = Math.min(
    COUNTER_ORDER_MAX_QUANTITY,
    Math.max(1, Math.trunc(input.quantity)),
  );
  const addonIds = dedupeAddonIds(input.addonIds);
  const catalogAddons = [
    ...input.product.addons,
    ...input.product.addonGroups.flatMap((group) =>
      group.options.map((option) => option.addon),
    ),
  ];
  const addons = catalogAddons.filter((addon) => addonIds.includes(addon.id));
  const addonsTotal = addons.reduce((sum, addon) => sum + addon.priceCents, 0);
  const unitPriceCentsForDisplay = input.product.priceCents + addonsTotal;
  const notes = input.notes?.trim()
    ? input.notes.trim().slice(0, COUNTER_ORDER_ITEM_NOTES_MAX)
    : null;

  return {
    draftId: createDraftId(),
    productId: input.product.id,
    productName: input.product.name,
    quantity,
    addonIds: addons.map((addon) => addon.id),
    addons,
    notes,
    unitPriceCentsForDisplay,
    lineTotalCentsForDisplay: unitPriceCentsForDisplay * quantity,
  };
}

export function updateDraftLineQuantity(
  lines: CounterDraftLine[],
  draftId: string,
  quantity: number,
): CounterDraftLine[] {
  const nextQuantity = Math.min(
    COUNTER_ORDER_MAX_QUANTITY,
    Math.max(1, Math.trunc(quantity)),
  );

  return lines.map((line) => {
    if (line.draftId !== draftId) {
      return line;
    }

    return {
      ...line,
      quantity: nextQuantity,
      lineTotalCentsForDisplay: line.unitPriceCentsForDisplay * nextQuantity,
    };
  });
}

export function removeDraftLine(
  lines: CounterDraftLine[],
  draftId: string,
): CounterDraftLine[] {
  return lines.filter((line) => line.draftId !== draftId);
}

export function getDraftTotalCents(lines: CounterDraftLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTotalCentsForDisplay, 0);
}

export function getDraftItemCount(lines: CounterDraftLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function filterCatalogProducts(
  products: CounterCatalogProduct[],
  query: string,
): CounterCatalogProduct[] {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) {
    return products;
  }

  return products.filter((product) =>
    product.name.toLocaleLowerCase("pt-BR").includes(normalized),
  );
}

export function buildCreateCounterOrderPayload(input: {
  customerLabel: string;
  orderNotes?: string;
  lines: CounterDraftLine[];
}): CounterOrderSubmitPayload {
  const customerLabel = input.customerLabel.trim().slice(
    0,
    COUNTER_ORDER_CUSTOMER_LABEL_MAX,
  );
  const notes = input.orderNotes?.trim()
    ? input.orderNotes.trim().slice(0, 300)
    : undefined;

  return {
    ...(customerLabel ? { customerLabel } : {}),
    ...(notes ? { notes } : {}),
    items: input.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      addonIds: line.addonIds,
      ...(line.notes ? { notes: line.notes } : {}),
    })),
  };
}
