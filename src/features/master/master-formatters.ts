/** Mask WhatsApp for display (keep last 4 digits). Never logs full value. */
export function maskWhatsApp(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "");

  if (digits.length <= 4) {
    return "****";
  }

  const visible = digits.slice(-4);
  return `****${visible}`;
}

export function formatMasterDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
