/**
 * Parses a BR-style money string into integer cents.
 * Accepts values like "50", "50,00", "R$ 50,00", "50.00".
 */
export function parseCurrencyToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed
    .replace(/[Rr]\$\s?/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 100);
}
