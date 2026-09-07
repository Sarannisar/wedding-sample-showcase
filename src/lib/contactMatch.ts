/**
 * Normalizes contact names for consistent duplicate checking.
 * Trims, lowercases, collapses internal whitespace, and strips diacritics and punctuation.
 */
export function normalizeName(name?: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extracts digits only from a phone number string.
 */
export function normalizeDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Takes the last 9 digits of a phone string to tolerate +94, 0, or raw mobile prefix differences.
 */
export function last9(digits: string): string {
  if (!digits) return '';
  return digits.slice(-9);
}

/**
 * Dual match check: A duplicate strictly requires BOTH a normalized name match
 * AND a non-empty phone match (matching the last 9 digits).
 * 
 * If either contact is missing a phone number, they are NOT considered duplicates.
 */
export function isSameContact(
  nameA: string,
  phoneA?: string | null,
  nameB?: string | null,
  phoneB?: string | null
): boolean {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB || '');
  if (!a || a !== b) return false;

  const da = normalizeDigits(phoneA);
  const db = normalizeDigits(phoneB);
  if (!da || !db) return false; // no phone on either side => NOT a duplicate
  return last9(da) === last9(db); // tolerate +94 / 0 prefixes
}

/**
 * Builds an indexing key for Set lookups (e.g. during CSV staging).
 * Returns null if phone is empty, since entries without phones never collide as duplicates.
 */
export function buildContactKey(name: string, phone?: string | null): string | null {
  const normName = normalizeName(name);
  if (!normName) return null;
  const digits = normalizeDigits(phone);
  if (!digits || digits.length < 7) return null;
  return `${normName}::${last9(digits)}`;
}
