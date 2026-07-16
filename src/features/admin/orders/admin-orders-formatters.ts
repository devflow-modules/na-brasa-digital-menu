import { formatMoney } from "@/features/menu/format-money";
import type {
  AdminDeliveryType,
  AdminOrderSource,
  AdminOrderStatus,
  AdminPaymentMethod,
} from "@/features/admin/orders/admin-orders.types";

export { formatMoney };

export function formatOrderStatus(status: AdminOrderStatus): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "CONFIRMED":
      return "Confirmado";
    case "PREPARING":
      return "Em preparo";
    case "READY":
      return "Pronto";
    case "OUT_FOR_DELIVERY":
      return "Saiu para entrega";
    case "COMPLETED":
      return "Concluído";
    case "CANCELLED":
      return "Cancelado";
  }
}

export function formatDeliveryType(type: AdminDeliveryType): string {
  return type === "DELIVERY" ? "Entrega" : "Retirada";
}

export function formatPaymentMethod(
  method: AdminPaymentMethod | null,
): string {
  if (method == null) {
    return "Pagamento pendente";
  }

  switch (method) {
    case "PIX":
      return "Pix";
    case "CASH":
      return "Dinheiro";
    case "CARD":
      return "Cartão";
  }
}

export function formatOrderSource(source: AdminOrderSource): string {
  switch (source) {
    case "DIRECT":
      return "Online";
    case "COUNTER":
      return "Balcão";
    case "IFOOD":
      return "iFood";
    case "OTHER":
      return "Outro";
  }
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatPhone(phone: string | null): string {
  if (phone == null || phone.trim() === "") {
    return "Sem telefone";
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}
