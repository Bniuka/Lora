// Promo Code & Discount calculation helper for Lora Session Packs

/**
 * Generates a clean, modern promo code in the format:
 * LORA-FREE-7X9 or LORA-SAVE-7X9
 */
export function generatePromoCode(type = 'free') {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid 0/O, 1/I confusion
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const prefix = type === 'free' ? 'LORA-FREE' : 'LORA-SAVE';
  return `${prefix}-${suffix}`;
}

/**
 * Normalizes user input for promo codes (trims whitespace, converts to uppercase)
 */
export function normalizePromoCode(code) {
  if (!code) return '';
  return code.trim().toUpperCase();
}

/**
 * Calculates the discounted price and savings for a session pack
 */
export function calculateDiscountedPrice(originalPrice, promo) {
  const price = Math.max(0, Number(originalPrice) || 0);
  if (!promo || price === 0) {
    return {
      finalPrice: price,
      discountAmount: 0,
      isFree: price === 0,
    };
  }

  const type = promo.discount_type || 'free';
  const val = Number(promo.discount_value) || 0;

  if (type === 'free') {
    return {
      finalPrice: 0,
      discountAmount: price,
      isFree: true,
    };
  }

  if (type === 'percentage') {
    const percent = Math.min(100, Math.max(0, val));
    const discountAmount = Math.round((price * percent) / 100);
    const finalPrice = Math.max(0, price - discountAmount);
    return {
      finalPrice,
      discountAmount,
      isFree: finalPrice === 0,
    };
  }

  if (type === 'fixed') {
    const discountAmount = Math.min(price, Math.max(0, val));
    const finalPrice = Math.max(0, price - discountAmount);
    return {
      finalPrice,
      discountAmount,
      isFree: finalPrice === 0,
    };
  }

  return {
    finalPrice: price,
    discountAmount: 0,
    isFree: price === 0,
  };
}

/**
 * Formats a readable badge label for the discount
 */
export function formatPromoDiscount(promo, currency = 'LKR') {
  if (!promo) return '';
  const type = promo.discount_type || 'free';
  const val = Number(promo.discount_value) || 0;

  if (type === 'free') return '100% Free Access';
  if (type === 'percentage') return `${val}% OFF`;
  if (type === 'fixed') return `${currency} ${val.toLocaleString()} OFF`;
  return 'Discount Applied';
}

/**
 * Validates whether a promo code is still active, within attempt limit, and not expired
 */
export function checkPromoValidity(promo) {
  if (!promo) {
    return { valid: false, error: 'Promo code does not exist.' };
  }

  if (promo.is_active === false) {
    return { valid: false, error: 'This promo code is no longer active.' };
  }

  if (promo.max_uses && promo.used_count >= promo.max_uses) {
    return {
      valid: false,
      error: `This promo code has reached its maximum limit (${promo.max_uses}/${promo.max_uses} claimed).`,
    };
  }

  if (promo.expires_at) {
    const expTime = new Date(promo.expires_at).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) {
      return { valid: false, error: 'This promo code has expired.' };
    }
  }

  return { valid: true };
}

/**
 * Formats expiration date/status for display
 */
export function getPromoExpiryInfo(promo) {
  if (!promo || !promo.expires_at) {
    return { hasExpiry: false, isExpired: false, formattedDate: 'No expiration' };
  }

  const expDate = new Date(promo.expires_at);
  if (isNaN(expDate.getTime())) {
    return { hasExpiry: false, isExpired: false, formattedDate: 'No expiration' };
  }

  const isExpired = expDate.getTime() < Date.now();
  const formattedDate = expDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return {
    hasExpiry: true,
    isExpired,
    formattedDate,
  };
}
