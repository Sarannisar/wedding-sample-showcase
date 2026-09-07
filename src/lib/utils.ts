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

  // 1. If starts with '+' -> Keep user's exact international country code (e.g. +44..., +971..., +1..., +94...)
  if (cleaned.startsWith('+')) {
    const digits = cleaned.substring(1).replace(/\D/g, '');
    if (!digits) return null;
    return `+${digits}`;
  }

  // 2. If starts with '00' (international dialing prefix) -> convert to '+'
  if (cleaned.startsWith('00')) {
    const digits = cleaned.substring(2).replace(/\D/g, '');
    if (!digits) return null;
    return `+${digits}`;
  }

  // 3. For all numbers without '+' -> Treated as Sri Lankan number (+94)
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly) return null;

  // If already starts with 94 (e.g. 94771234567)
  if (digitsOnly.startsWith('94') && digitsOnly.length === 11) {
    return `+${digitsOnly}`;
  }

  // If starts with 0 (e.g. 0771234567) -> strip leading 0 and prepend +94
  if (digitsOnly.startsWith('0')) {
    return `+94${digitsOnly.substring(1)}`;
  }

  // Local 9-digit or general fallback (e.g. 771234567) -> prepend +94
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

/**
 * Returns formatted relative time (e.g. "just now", "2 minutes ago", "3 hours ago", "5 days ago")
 */
export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return 'never';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000);

  const absDiff = Math.abs(diffSec);
  if (absDiff < 45) return 'just now';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (absDiff < 3600) {
    const mins = Math.round(diffSec / 60);
    return rtf.format(mins, 'minute');
  }
  if (absDiff < 86400) {
    const hours = Math.round(diffSec / 3600);
    return rtf.format(hours, 'hour');
  }
  const days = Math.round(diffSec / 86400);
  return rtf.format(days, 'day');
}
