import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a random 6-character alphanumeric code (e.g., 'K7P9X2', '4M9L3A')
 */
export function generateRandomCode(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }
  return result;
}

/**
 * Generates a unique 6-character alphanumeric slug
 */
export function generateSlug(_name?: string, existingSlugs: string[] = []): string {
  let code = generateRandomCode(6);
  let attempts = 0;
  while (existingSlugs.some((s) => s.toLowerCase() === code.toLowerCase()) && attempts < 100) {
    code = generateRandomCode(6);
    attempts++;
  }
  return code;
}

/**
 * Normalizes Sri Lankan and international phone numbers:
 * e.g. "0771234567" -> "+94771234567"
 * e.g. "771234567"  -> "+94771234567"
 * e.g. "94771234567" -> "+94771234567"
 * e.g. "+94 77 123 4567" -> "+94771234567"
 */
export function formatPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  if (!cleaned) return null;

  // If already starts with +
  if (cleaned.startsWith('+')) {
    const digits = cleaned.substring(1).replace(/\D/g, '');
    if (digits.startsWith('94')) {
      return `+94${digits.substring(2)}`;
    }
    return `+${digits}`;
  }

  // If starts with 00 (international prefix)
  if (cleaned.startsWith('00')) {
    const digits = cleaned.substring(2).replace(/\D/g, '');
    if (digits.startsWith('94')) {
      return `+94${digits.substring(2)}`;
    }
    return `+${digits}`;
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly) return null;

  // Starts with 0 (e.g. 0771234567) -> 10 digits
  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    return `+94${digitsOnly.substring(1)}`;
  }

  // 9 digits (e.g. 771234567) -> prepend +94
  if (digitsOnly.length === 9) {
    return `+94${digitsOnly}`;
  }

  // 11 digits starting with 94 (e.g. 94771234567) -> prepend +
  if (digitsOnly.startsWith('94') && digitsOnly.length === 11) {
    return `+${digitsOnly}`;
  }

  // Default fallback if numbers entered
  if (digitsOnly.startsWith('0')) {
    return `+94${digitsOnly.substring(1)}`;
  }

  return `+94${digitsOnly}`;
}

export function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return 'Not responded';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
