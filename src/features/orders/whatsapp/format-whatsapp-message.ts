import { formatMoney } from "@/features/menu/format-money";

export type WhatsAppMessageAddon = {
  name: string;
  priceCents: number;
};

export type WhatsAppMessageItem = {
  quantity: number;
  productName: string;
  lineTotalCents: number;
  addons: WhatsAppMessageAddon[];
};

export type WhatsAppMessageOrder = {
  code: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  deliveryType: "PICKUP" | "DELIVERY";
  deliveryAddress?: string | null;
  paymentLabel: string;
  changeForCents?: number | null;
  notes?: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: WhatsAppMessageItem[];
};

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone.trim();
}

export function formatWhatsAppMessage(order: WhatsAppMessageOrder): string {
  const lines: string[] = [
    `🔥 Novo pedido — ${order.storeName}`,
    "",
    `Pedido: #${order.code}`,
    "",
    `Cliente: ${order.customerName}`,
    `Telefone: ${formatPhoneDisplay(order.customerPhone)}`,
    "",
    `Tipo: ${order.deliveryType === "DELIVERY" ? "Entrega" : "Retirada"}`,
  ];

  if (order.deliveryType === "DELIVERY" && order.deliveryAddress) {
    lines.push(`Endereço: ${order.deliveryAddress}`);
  }

  lines.push("", "Itens:");

  for (const item of order.items) {
    lines.push(
      `${item.quantity}x ${item.productName} — ${formatMoney(item.lineTotalCents)}`,
    );

    if (item.addons.length > 0) {
      lines.push("   Adicionais:");
      for (const addon of item.addons) {
        lines.push(
          `   + ${addon.name} — ${formatMoney(addon.priceCents)}`,
        );
      }
    }
  }

  lines.push(
    "",
    `Subtotal: ${formatMoney(order.subtotalCents)}`,
  );

  if (order.deliveryType === "DELIVERY") {
    lines.push(`Entrega: ${formatMoney(order.deliveryFeeCents)}`);
  }

  lines.push(`Total: ${formatMoney(order.totalCents)}`, "");
  lines.push(`Pagamento: ${order.paymentLabel}`);

  if (
    order.paymentLabel === "Dinheiro" &&
    typeof order.changeForCents === "number" &&
    order.changeForCents > 0
  ) {
    lines.push(`Troco para: ${formatMoney(order.changeForCents)}`);
  }

  const notes = order.notes?.trim();
  if (notes) {
    lines.push("", "Observações:", notes);
  }

  return lines.join("\n");
}
