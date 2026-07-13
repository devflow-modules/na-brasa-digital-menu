export function generateOrderCode(): string {
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 900 + 100).toString();
  return `NB-${timePart}-${randomPart}`;
}
