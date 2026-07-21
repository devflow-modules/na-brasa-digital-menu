export function normalizeWhatsappDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export type WhatsappInputStatus =
  | "empty"
  | "incomplete"
  | "valid"
  | "too_long";

export function getWhatsappInputStatus(value: string): WhatsappInputStatus {
  const digits = normalizeWhatsappDigits(value);
  if (digits.length === 0) return "empty";
  if (digits.length < 10) return "incomplete";
  if (digits.length > 13) return "too_long";
  return "valid";
}

export function whatsappStatusMessage(status: WhatsappInputStatus): string | null {
  switch (status) {
    case "empty":
      return "Inclua DDD e código do país";
    case "incomplete":
      return "Número incompleto. Inclua DDD e código do país.";
    case "valid":
      return "Número válido";
    case "too_long":
      return "Número inválido";
    default:
      return null;
  }
}

function formatLocalNumber(num: string): string {
  if (num.length <= 4) return num;
  return `${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
}

/** Formats digits for admin display, e.g. 5513981091971 → +55 (13) 98109-1971. */
export function formatWhatsappForDisplay(value: string): string {
  const digits = normalizeWhatsappDigits(value).slice(0, 13);
  if (!digits) return "";

  if (digits.startsWith("55")) {
    const rest = digits.slice(2);
    if (rest.length === 0) return "+55";
    const ddd = rest.slice(0, 2);
    const num = rest.slice(2);
    if (rest.length <= 2) return `+55 (${ddd}`;
    return `+55 (${ddd}) ${formatLocalNumber(num)}`.trim();
  }

  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const num = digits.slice(2);
  return `(${ddd}) ${formatLocalNumber(num)}`.trim();
}
