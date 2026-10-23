// Promo Code generator & helper for Lora Session Packs

/**
 * Generates a clean, modern promo code in the format:
 * LORA-FREE-7X9
 */
export function generatePromoCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid 0/O, 1/I confusion
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LORA-FREE-${suffix}`;
}

/**
 * Normalizes user input for promo codes (trims whitespace, converts to uppercase)
 */
export function normalizePromoCode(code) {
  if (!code) return '';
  return code.trim().toUpperCase();
}
