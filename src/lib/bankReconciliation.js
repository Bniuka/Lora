/**
 * Pure utilities for Creator Bank Slip Reconciliation, multi-bank attribution,
 * statement reference matching, and CSV audit export.
 */

const BANK_ALIAS_GROUPS = [
  ['boc', 'bank of ceylon'],
  ['combank', 'commercial bank', 'commercial bank of ceylon'],
  ['hnb', 'hatton national bank'],
  ['sampath', 'sampath bank'],
  ['seylan', 'seylan bank'],
  ['peoples', 'peoples bank', "people's bank"],
  ['ntb', 'nations trust bank'],
  ['dfcc', 'dfcc bank'],
  ['ndb', 'national development bank'],
  ['amana', 'amana bank'],
  ['pabc', 'pan asia bank', 'pan asia banking', 'pan asia banking corporation'],
];

export function normalizeBankToken(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[.,()_-]/g, ' ')
    .replace(/\b(plc|ltd|limited)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCanonicalBankKey(name) {
  const norm = normalizeBankToken(name);
  if (!norm) return '';
  for (const group of BANK_ALIAS_GROUPS) {
    if (group.some((alias) => norm === alias || norm.startsWith(alias + ' ') || alias.startsWith(norm + ' '))) {
      return group[0];
    }
  }
  return norm;
}

export function isConfirmedStatus(status) {
  return status === 'active' || status === 'confirmed' || status === 'verified';
}

/**
 * Extracts normalized creator bank accounts from a `creator_bank_details` record.
 */
export function extractConfiguredBanks(bankDetails) {
  if (!bankDetails) return [];

  let rawList = [];
  if (Array.isArray(bankDetails.bank_accounts) && bankDetails.bank_accounts.length > 0) {
    rawList = bankDetails.bank_accounts;
  } else if (bankDetails.bank_name || bankDetails.account_number) {
    rawList = [bankDetails];
  }

  const normalized = rawList
    .filter((acc) => acc && ((acc.bank_name || '').trim() || (acc.account_number || '').trim()))
    .map((acc, idx) => ({
      id: acc.id || `bank_${idx}`,
      bank_name: (acc.bank_name || 'Bank Account').trim(),
      account_number: (acc.account_number || '').trim(),
      account_holder_name: (acc.account_holder_name || acc.account_holder || '').trim(),
      branch: (acc.branch || '').trim(),
      branch_code: (acc.branch_code || '').trim(),
      country: (acc.country || 'LK').trim(),
      is_primary: Boolean(acc.is_primary),
    }));

  if (normalized.length > 0 && !normalized.some((b) => b.is_primary)) {
    normalized[0].is_primary = true;
  }

  return normalized;
}

export function maskAccountNumber(accountNumber) {
  const clean = String(accountNumber || '').trim();
  if (!clean) return 'Account not set';
  if (clean.length <= 4) return `•••• ${clean}`;
  return `•••• ${clean.slice(-4)}`;
}

export function getEnrollmentBankName(enrollment) {
  if (!enrollment) return '';
  if (enrollment.bank_name_used && String(enrollment.bank_name_used).trim()) {
    return String(enrollment.bank_name_used).trim();
  }
  const pm = String(enrollment.payment_method_used || '').trim();
  if (pm.toLowerCase().startsWith('bank:')) {
    return pm.slice(5).trim();
  }
  return '';
}

export function getEnrollmentRefCode(enrollment) {
  if (!enrollment) return 'N/A';
  return (
    enrollment.payment_reference_code ||
    enrollment.bank_ref ||
    enrollment.payment_reference ||
    (enrollment.id ? String(enrollment.id).slice(0, 8) : 'N/A')
  );
}

export function getEnrollmentDate(enrollment) {
  return enrollment?.submitted_at || enrollment?.created_at || null;
}

/**
 * Classifies an enrollment's payment method and determines exact amount paid.
 * Avoids the `0 || packPrice` falsy bug for 100% free promo codes.
 */
export function classifyEnrollmentPayment(enrollment, packObj) {
  const pm = String(enrollment?.payment_method_used || '').trim();
  const pmLower = pm.toLowerCase();
  const ref = String(enrollment?.payment_reference_code || '').trim();
  const bankName = getEnrollmentBankName(enrollment);
  const promoCode =
    enrollment?.promo_code_used ||
    (pmLower.startsWith('promo:') ? pm.slice(6).trim() : '');

  const hasAmountPaid =
    enrollment?.amount_paid !== null &&
    enrollment?.amount_paid !== undefined &&
    enrollment?.amount_paid !== '';
  const numericAmountPaid = hasAmountPaid ? Number(enrollment.amount_paid) : null;
  const currency = packObj?.currency || 'LKR';

  const isFree =
    pmLower === 'free' ||
    ref.toUpperCase().startsWith('FREE_') ||
    (packObj && Number(packObj.price) === 0 && (!hasAmountPaid || numericAmountPaid === 0));

  if (isFree) {
    return {
      kind: 'free',
      label: 'Free Enrollment',
      bankName: '',
      promoCode: promoCode || '',
      amount: 0,
      currency,
      isFree: true,
    };
  }

  const isPromoFree =
    pmLower.startsWith('promo:') ||
    (Boolean(promoCode) && hasAmountPaid && numericAmountPaid === 0);

  if (isPromoFree) {
    return {
      kind: 'promo',
      label: promoCode ? `Promo (${promoCode})` : 'Free Promo',
      bankName: '',
      promoCode,
      amount: 0,
      currency,
      isFree: true,
    };
  }

  const resolvedAmount = hasAmountPaid
    ? (Number.isFinite(numericAmountPaid) ? Math.max(0, numericAmountPaid) : 0)
    : Math.max(0, Number(packObj?.price || 0) || 0);

  const isBank =
    pmLower === 'bank' ||
    pmLower.startsWith('bank:') ||
    Boolean(bankName);

  if (isBank) {
    return {
      kind: 'bank',
      label: bankName ? `Bank (${bankName})` : 'Bank Transfer',
      bankName,
      promoCode,
      amount: resolvedAmount,
      currency,
      isFree: false,
    };
  }

  return {
    kind: 'link',
    label: pmLower === 'manual' ? 'Manual Payment' : 'Payment Link',
    bankName: '',
    promoCode,
    amount: resolvedAmount,
    currency,
    isFree: false,
  };
}

/**
 * Matches a single enrollment deterministically to at most one channel key:
 * - A configured bank's `id`
 * - `'unmatched_bank'` (bank transfer not matching any configured bank)
 * - `'link'` | `'free'` | `'promo'`
 */
export function matchEnrollmentToChannel(enrollment, bankAccounts, packObj) {
  const info = classifyEnrollmentPayment(enrollment, packObj);
  if (info.kind !== 'bank') {
    return { channelKey: info.kind, bankAccount: null, info };
  }

  if (!bankAccounts || bankAccounts.length === 0) {
    return { channelKey: 'unmatched_bank', bankAccount: null, info };
  }

  const enrBank = info.bankName;
  if (!enrBank) {
    const primary = bankAccounts.find((b) => b.is_primary) || bankAccounts[0];
    return { channelKey: primary.id, bankAccount: primary, info };
  }

  const normEnr = normalizeBankToken(enrBank);
  const canonEnr = getCanonicalBankKey(enrBank);

  // 1. Exact normalized match
  const exact = bankAccounts.find((b) => normalizeBankToken(b.bank_name) === normEnr);
  if (exact) return { channelKey: exact.id, bankAccount: exact, info };

  // 2. Canonical alias match (e.g. "BOC" <-> "Bank of Ceylon", "Commercial Bank" <-> "Commercial Bank of Ceylon PLC")
  const aliasMatch = bankAccounts.find((b) => getCanonicalBankKey(b.bank_name) === canonEnr);
  if (aliasMatch) return { channelKey: aliasMatch.id, bankAccount: aliasMatch, info };

  // 3. Substring match for custom bank names
  if (normEnr.length >= 3) {
    const partial = bankAccounts.find((b) => {
      const nb = normalizeBankToken(b.bank_name);
      return nb.length >= 3 && (nb.includes(normEnr) || normEnr.includes(nb));
    });
    if (partial) return { channelKey: partial.id, bankAccount: partial, info };
  }

  return { channelKey: 'unmatched_bank', bankAccount: null, info };
}

export function addToCurrencyMap(map, currency, amount) {
  const cur = currency || 'LKR';
  const num = Number(amount) || 0;
  if (num === 0 && map[cur] === undefined) return map;
  map[cur] = (map[cur] || 0) + num;
  return map;
}

export function formatCurrencyMap(currencyMap, fallbackCurrency = 'LKR') {
  const entries = Object.entries(currencyMap || {}).filter(([, val]) => Number(val) > 0);
  if (entries.length === 0) {
    return `${fallbackCurrency} 0`;
  }
  return entries
    .map(([cur, val]) => `${cur} ${Math.round(val).toLocaleString()}`)
    .join(' · ');
}

export function computeCommissionSavingsMap(currencyMap, rate = 0.15) {
  const out = {};
  for (const [cur, val] of Object.entries(currencyMap || {})) {
    if (Number(val) > 0) {
      out[cur] = Math.round(Number(val) * rate);
    }
  }
  return out;
}

/**
 * Computes full reconciliation KPIs and per-bank / per-channel breakdowns.
 */
export function computeReconciliationSummary({
  enrollments = [],
  packs = [],
  bankAccounts = [],
  creatorPayOption = '',
}) {
  const packMap = new Map(packs.map((p) => [p.id, p]));
  const primaryCurrency = packs.find((p) => p.currency)?.currency || 'LKR';

  const verifiedRevenueMap = {};
  const pendingRevenueMap = {};

  let verifiedCount = 0;
  let verifiedBankCount = 0;
  let verifiedLinkCount = 0;
  let verifiedFreeOrPromoCount = 0;
  let pendingCount = 0;
  let pendingBankCount = 0;
  let rejectedCount = 0;
  let expiredCount = 0;

  // Per-channel stats accumulator
  const channelStats = new Map();
  const ensureBucket = (key) => {
    if (!channelStats.has(key)) {
      channelStats.set(key, {
        verifiedCount: 0,
        verifiedRevenueMap: {},
        pendingCount: 0,
        pendingRevenueMap: {},
        rejectedCount: 0,
      });
    }
    return channelStats.get(key);
  };

  for (const bank of bankAccounts) {
    ensureBucket(bank.id);
  }

  for (const enr of enrollments) {
    const packObj = packMap.get(enr.pack_id);
    const { channelKey, info } = matchEnrollmentToChannel(enr, bankAccounts, packObj);
    const bucket = ensureBucket(channelKey);

    if (isConfirmedStatus(enr.status)) {
      verifiedCount++;
      if (info.kind === 'bank') verifiedBankCount++;
      else if (info.kind === 'link') verifiedLinkCount++;
      else verifiedFreeOrPromoCount++;

      if (!info.isFree && info.amount > 0) {
        addToCurrencyMap(verifiedRevenueMap, info.currency, info.amount);
        addToCurrencyMap(bucket.verifiedRevenueMap, info.currency, info.amount);
      }
      bucket.verifiedCount++;
    } else if (enr.status === 'pending') {
      pendingCount++;
      if (info.kind === 'bank') pendingBankCount++;
      if (!info.isFree && info.amount > 0) {
        addToCurrencyMap(pendingRevenueMap, info.currency, info.amount);
        addToCurrencyMap(bucket.pendingRevenueMap, info.currency, info.amount);
      }
      bucket.pendingCount++;
    } else if (enr.status === 'rejected') {
      rejectedCount++;
      bucket.rejectedCount++;
    } else if (enr.status === 'expired') {
      expiredCount++;
    }
  }

  const bankCards = bankAccounts.map((bank) => {
    const stats = channelStats.get(bank.id);
    return {
      id: bank.id,
      channelKey: bank.id,
      bankName: bank.bank_name,
      accountNum: bank.account_number,
      maskedAccountNum: maskAccountNumber(bank.account_number),
      accountHolder: bank.account_holder_name,
      branch: bank.branch,
      isPrimary: bank.is_primary,
      verifiedCount: stats.verifiedCount,
      verifiedRevenueMap: stats.verifiedRevenueMap,
      pendingCount: stats.pendingCount,
      pendingRevenueMap: stats.pendingRevenueMap,
      rejectedCount: stats.rejectedCount,
    };
  });

  const linkStats = channelStats.get('link') || {
    verifiedCount: 0,
    verifiedRevenueMap: {},
    pendingCount: 0,
    pendingRevenueMap: {},
    rejectedCount: 0,
  };
  const showLinkCard =
    linkStats.verifiedCount + linkStats.pendingCount + linkStats.rejectedCount > 0 ||
    creatorPayOption === 'link' ||
    creatorPayOption === 'both';

  const unmatchedStats = channelStats.get('unmatched_bank') || {
    verifiedCount: 0,
    verifiedRevenueMap: {},
    pendingCount: 0,
    pendingRevenueMap: {},
    rejectedCount: 0,
  };
  const showUnmatchedCard =
    unmatchedStats.verifiedCount + unmatchedStats.pendingCount + unmatchedStats.rejectedCount > 0;

  return {
    primaryCurrency,
    verifiedRevenueMap,
    pendingRevenueMap,
    commissionSavingsMap: computeCommissionSavingsMap(verifiedRevenueMap, 0.15),
    verifiedCount,
    verifiedBankCount,
    verifiedLinkCount,
    verifiedFreeOrPromoCount,
    pendingCount,
    pendingBankCount,
    rejectedCount,
    expiredCount,
    bankCards,
    linkCard: showLinkCard ? { channelKey: 'link', ...linkStats } : null,
    unmatchedBankCard: showUnmatchedCard ? { channelKey: 'unmatched_bank', ...unmatchedStats } : null,
  };
}

/**
 * Filters enrollments for the Payment Slips Audit Register.
 */
export function filterReconciliationEnrollments({
  enrollments = [],
  packs = [],
  bankAccounts = [],
  statusFilter = 'all',
  bankFilter = 'all',
  packFilter = 'all',
  searchQuery = '',
}) {
  const packMap = new Map(packs.map((p) => [p.id, p]));
  const q = searchQuery.trim().toLowerCase();

  return enrollments.filter((enr) => {
    if (statusFilter === 'verified') {
      if (!isConfirmedStatus(enr.status)) return false;
    } else if (statusFilter !== 'all' && enr.status !== statusFilter) {
      return false;
    }

    if (packFilter !== 'all' && enr.pack_id !== packFilter) {
      return false;
    }

    const packObj = packMap.get(enr.pack_id);
    const { channelKey, info } = matchEnrollmentToChannel(enr, bankAccounts, packObj);

    if (bankFilter !== 'all') {
      if (bankFilter === 'free_promo') {
        if (channelKey !== 'free' && channelKey !== 'promo') return false;
      } else if (channelKey !== bankFilter) {
        return false;
      }
    }

    if (q) {
      const prof = enr.profiles || enr.student || {};
      const studentName = `${prof.first_name || ''} ${prof.last_name || ''}`.toLowerCase();
      const email = String(prof.email || '').toLowerCase();
      const phone = String(prof.contact_number || prof.phone || '').toLowerCase();
      const refCode = String(getEnrollmentRefCode(enr)).toLowerCase();
      const bankName = String(info.bankName || '').toLowerCase();
      const packTitle = String(packObj?.title || '').toLowerCase();
      const promoCode = String(info.promoCode || '').toLowerCase();

      const matchesSearch =
        studentName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        refCode.includes(q) ||
        bankName.includes(q) ||
        packTitle.includes(q) ||
        promoCode.includes(q);

      if (!matchesSearch) return false;
    }

    return true;
  });
}

/**
 * Cross-checks pasted bank statement / SMS / CSV text against creator enrollments.
 */
export function matchBankStatementText({
  statementText = '',
  enrollments = [],
  packs = [],
  bankAccounts = [],
  bankFilter = 'all',
}) {
  const upperText = String(statementText || '').toUpperCase();
  const compactText = upperText.replace(/[^A-Z0-9]/g, '');
  const packMap = new Map(packs.map((p) => [p.id, p]));

  const matchedPending = [];
  const matchedVerified = [];
  const unmatchedPending = [];
  const matchedRefTokens = new Set();

  if (!upperText.trim()) {
    return { matchedPending, matchedVerified, unmatchedPending, unrecognizedRefs: [] };
  }

  const candidates = [];

  for (const enr of enrollments) {
    const packObj = packMap.get(enr.pack_id);
    const { channelKey, info } = matchEnrollmentToChannel(enr, bankAccounts, packObj);

    // Only consider paid / bank / link transfers (skip 100% free enrollments)
    if (info.isFree) continue;
    if (bankFilter !== 'all' && channelKey !== bankFilter) continue;

    const rawRef = String(
      enr.payment_reference_code || enr.bank_ref || enr.payment_reference || ''
    ).trim();
    const refUpper = rawRef.toUpperCase();
    const refCompact = refUpper.replace(/[^A-Z0-9]/g, '');
    candidates.push({ enr, packObj, info, rawRef, refUpper, refCompact });
  }

  // Pass 1: exact & name+digits matches, scrubbing matched LORA tokens before Pass 2
  const matchedExactIds = new Set();
  let remainingTextForDigits = upperText;

  for (const item of candidates) {
    const { enr, packObj, info, rawRef, refUpper, refCompact } = item;
    if (!refUpper) continue;

    let isExact = upperText.includes(refUpper) || (refCompact.length >= 6 && compactText.includes(refCompact));
    if (!isExact) {
      const loraParts = refUpper.match(/^LORA[_-]([A-Z0-9]+)[_-](\d{4})$/);
      if (loraParts) {
        const [, namePart, digits] = loraParts;
        if (compactText.includes(`${namePart}${digits}`)) {
          isExact = true;
        }
      }
    }

    if (isExact) {
      matchedExactIds.add(enr.id);
      if (refCompact) matchedRefTokens.add(refCompact);
      const loraTokenEscaped = refUpper.replace(/[^A-Z0-9]+/g, '[_\\s-]?');
      remainingTextForDigits = remainingTextForDigits.replace(new RegExp(loraTokenEscaped, 'g'), ' ');

      const entry = { enrollment: enr, packObj, info, refCode: rawRef, matchType: 'exact' };
      if (enr.status === 'pending') {
        matchedPending.push(entry);
      } else if (isConfirmedStatus(enr.status)) {
        matchedVerified.push(entry);
      }
    }
  }

  // Pass 2: 4-digit suffix fallback against remaining statement text (never colliding with exact LORA tokens)
  for (const item of candidates) {
    const { enr, packObj, info, rawRef, refUpper, refCompact } = item;
    if (matchedExactIds.has(enr.id)) continue;

    let isDigitMatch = false;
    const loraParts = refUpper.match(/^LORA[_-]([A-Z0-9]+)[_-](\d{4})$/);
    if (loraParts) {
      const digits = loraParts[2];
      const digitRegex = new RegExp(`(^|[^0-9])${digits}([^0-9]|$)`);
      if (digitRegex.test(remainingTextForDigits)) {
        isDigitMatch = true;
      }
    }

    if (isDigitMatch) {
      if (refCompact) matchedRefTokens.add(refCompact);
      const entry = { enrollment: enr, packObj, info, refCode: rawRef, matchType: 'digits' };
      if (enr.status === 'pending') {
        matchedPending.push(entry);
      } else if (isConfirmedStatus(enr.status)) {
        matchedVerified.push(entry);
      }
    } else if (enr.status === 'pending') {
      unmatchedPending.push({ enrollment: enr, packObj, info, refCode: rawRef || 'N/A' });
    }
  }

  // Find LORA_* style reference codes in the pasted text that didn't match any enrollment
  const statementLoraMatches = upperText.match(/LORA[_ -]?[A-Z0-9]{2,}[_ -]?\d{4}/g) || [];
  const unrecognizedSet = new Set();
  for (const token of statementLoraMatches) {
    const compact = token.replace(/[^A-Z0-9]/g, '');
    if (!matchedRefTokens.has(compact)) {
      unrecognizedSet.add(token.trim());
    }
  }

  return {
    matchedPending,
    matchedVerified,
    unmatchedPending,
    unrecognizedRefs: Array.from(unrecognizedSet),
  };
}

function escapeCsvCell(value) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Builds a clean UTF-8 CSV string for the reconciliation audit register.
 */
export function buildReconciliationCSV({
  rows = [],
  packs = [],
  reconciledIds = [],
}) {
  const packMap = new Map(packs.map((p) => [p.id, p]));
  const checkedSet = new Set(reconciledIds);

  const headers = [
    'Date',
    'Student Name',
    'Email',
    'Phone',
    'Course Pack',
    'Payment Method',
    'Bank Account',
    'Slip Reference Code',
    'Promo Code',
    'Currency',
    'Amount Paid',
    'Status',
    'Statement Checked',
    'Rejection Reason',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const enr of rows) {
    const prof = enr.profiles || enr.student || {};
    const studentName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Learner';
    const email = prof.email || '';
    const phone = prof.contact_number || prof.phone || 'N/A';
    const packObj = packMap.get(enr.pack_id);
    const packTitle = packObj?.title || 'Course';
    const info = classifyEnrollmentPayment(enr, packObj);
    const refCode = getEnrollmentRefCode(enr);
    const dateVal = getEnrollmentDate(enr);
    const dateStr = dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';
    const statusLabel = isConfirmedStatus(enr.status) ? 'Verified' : (enr.status || 'unknown');
    const checkedLabel = checkedSet.has(enr.id) ? 'Yes' : 'No';

    lines.push(
      [
        dateStr,
        studentName,
        email,
        phone,
        packTitle,
        info.label,
        info.bankName || '-',
        refCode,
        info.promoCode || '-',
        info.currency,
        info.amount,
        statusLabel,
        checkedLabel,
        enr.rejection_reason || '',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  return '\uFEFF' + lines.join('\n');
}
