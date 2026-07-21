/**
 * Build a WhatsApp share URL without a destination phone number.
 * Uses encodeURIComponent so the decoded text matches the clipboard payload.
 */
export function buildDailyClosingWhatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
