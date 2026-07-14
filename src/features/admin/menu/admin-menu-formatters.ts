export function formatAdminPriceCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatPriceCentsForInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
