import type { DeliveryType } from "@prisma/client";

export class IfoodSnapshotProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IfoodSnapshotProjectionError";
  }
}

export type ProjectedIfoodOrderItemAddon = {
  addonId: null;
  addonNameSnapshot: string;
  addonPriceCents: number;
};

export type ProjectedIfoodOrderItem = {
  productId: null;
  productNameSnapshot: string;
  productDescriptionSnapshot: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  notes: string | null;
  addons: ProjectedIfoodOrderItemAddon[];
};

export type ProjectedIfoodOrderDraft = {
  customerName: string;
  customerPhone: string | null;
  deliveryType: DeliveryType;
  deliveryAddress: string | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: ProjectedIfoodOrderItem[];
  displayId: string | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** iFood money fields arrive in BRL major units → cents. */
export function reaisToCents(value: number): number {
  return Math.round(value * 100);
}

function formatDeliveryAddress(delivery: Record<string, unknown> | null): string | null {
  const address = asObject(delivery?.deliveryAddress);
  if (!address) return null;
  const parts = [
    asString(address.formattedAddress),
    asString(address.neighborhood),
    asString(address.city),
    asString(address.state),
    asString(address.postalCode),
    asString(address.complement),
    asString(address.reference),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : null;
}

function mapDeliveryType(orderType: string | null): DeliveryType {
  if (orderType === "DELIVERY") return "DELIVERY";
  if (orderType === "TAKEOUT" || orderType === "DINE_IN") return "PICKUP";
  throw new IfoodSnapshotProjectionError(
    "Unsupported or missing iFood orderType for projection",
  );
}

function projectAddons(options: unknown): ProjectedIfoodOrderItemAddon[] {
  if (!Array.isArray(options)) return [];
  const addons: ProjectedIfoodOrderItemAddon[] = [];

  for (const option of options) {
    const root = asObject(option);
    if (!root) continue;
    const customizations = root.customizations;
    const hasCustomizations =
      Array.isArray(customizations) && customizations.length > 0;

    // Nested customization groups: project leaves only (skip empty wrapper name).
    if (hasCustomizations) {
      for (const customization of customizations) {
        const custom = asObject(customization);
        if (!custom) continue;
        const customName = asString(custom.name);
        const customPrice =
          asNumber(custom.unitPrice) ?? asNumber(custom.price) ?? 0;
        const customQty = asNumber(custom.quantity) ?? 1;
        if (customName) {
          addons.push({
            addonId: null,
            addonNameSnapshot: customName,
            addonPriceCents: reaisToCents(customPrice * customQty),
          });
        }
      }
      continue;
    }

    const name = asString(root.name);
    const unitPrice = asNumber(root.unitPrice) ?? asNumber(root.price) ?? 0;
    const quantity = asNumber(root.quantity) ?? 1;
    if (name) {
      addons.push({
        addonId: null,
        addonNameSnapshot: name,
        addonPriceCents: reaisToCents(unitPrice * quantity),
      });
    }
  }

  return addons;
}

function projectItems(items: unknown): ProjectedIfoodOrderItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new IfoodSnapshotProjectionError("iFood snapshot has no items");
  }

  return items.map((raw, index) => {
    const item = asObject(raw);
    if (!item) {
      throw new IfoodSnapshotProjectionError(`Invalid iFood item at index ${index}`);
    }
    const name = asString(item.name);
    if (!name) {
      throw new IfoodSnapshotProjectionError(`iFood item missing name at index ${index}`);
    }
    const quantity = asNumber(item.quantity) ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new IfoodSnapshotProjectionError(`Invalid iFood item quantity at index ${index}`);
    }
    const unitPrice = asNumber(item.unitPrice) ?? asNumber(item.price) ?? 0;
    const totalPrice =
      asNumber(item.totalPrice) ?? unitPrice * quantity;
    const notes = asString(item.observations);

    return {
      productId: null,
      productNameSnapshot: name,
      productDescriptionSnapshot: asString(item.externalCode),
      quantity,
      unitPriceCents: reaisToCents(unitPrice),
      totalCents: reaisToCents(totalPrice),
      notes,
      addons: projectAddons(item.options),
    };
  });
}

/**
 * Allowlisted projection from iFood GET /orders snapshot → operational draft.
 * Official total.orderAmount wins over reconstructed item sums.
 */
export function projectIfoodSnapshotToOrderDraft(
  snapshot: unknown,
): ProjectedIfoodOrderDraft {
  const root = asObject(snapshot);
  if (!root) {
    throw new IfoodSnapshotProjectionError("iFood snapshot is missing");
  }

  const category = asString(root.category);
  if (category != null && category !== "FOOD") {
    throw new IfoodSnapshotProjectionError(
      `iFood category ${category} is not projectable in this slice`,
    );
  }

  const customer = asObject(root.customer);
  const customerName = asString(customer?.name);
  if (!customerName) {
    throw new IfoodSnapshotProjectionError("iFood snapshot missing customer.name");
  }

  const phone = asObject(customer?.phone);
  const customerPhone = asString(phone?.number);

  const delivery = asObject(root.delivery);
  const deliveryType = mapDeliveryType(asString(root.orderType));
  const deliveryAddress =
    deliveryType === "DELIVERY" ? formatDeliveryAddress(delivery) : null;

  const total = asObject(root.total);
  const orderAmount = asNumber(total?.orderAmount);
  if (orderAmount == null) {
    throw new IfoodSnapshotProjectionError("iFood snapshot missing total.orderAmount");
  }
  const subTotal = asNumber(total?.subTotal) ?? orderAmount;
  const deliveryFee = asNumber(total?.deliveryFee) ?? 0;

  const observationParts = [
    asString(delivery?.observations),
    asString(root.extraInfo),
  ].filter(Boolean);

  return {
    customerName,
    customerPhone,
    deliveryType,
    deliveryAddress,
    notes: observationParts.length > 0 ? observationParts.join("\n") : null,
    subtotalCents: reaisToCents(subTotal),
    deliveryFeeCents: reaisToCents(deliveryFee),
    totalCents: reaisToCents(orderAmount),
    items: projectItems(root.items),
    displayId: asString(root.displayId),
  };
}

/** Deterministic globally unique Order.code; displayId stays for presentation. */
export function buildIfoodOperationalOrderCode(externalOrderId: string): string {
  const compact = externalOrderId.replace(/-/g, "").toUpperCase();
  return `IF-${compact}`;
}
