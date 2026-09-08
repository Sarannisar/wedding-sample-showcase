import { supabase } from './supabase';
import { weddingConfig } from '@/config/weddingConfig';

const AUTH_EXPIRY_KEY = 'wedding_dashboard_auth_expiry_v1';
const REMEMBER_ME_KEY = 'wedding_dashboard_remember_me_v1';

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || weddingConfig.admin.email;
export const ADMIN_NAME = weddingConfig.admin.name;

export interface SessionExpiryMeta {
  expiresAt: number;
  rememberMe: boolean;
  days: number;
}

/**
 * Records the session expiration timestamp in localStorage.
 * Default is 5 days, or 30 days if rememberMe is enabled.
 */
export function recordAuthSession(rememberMe: boolean): void {
  const days = rememberMe
    ? weddingConfig.admin.rememberMeSessionDays
    : weddingConfig.admin.defaultSessionDays;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

  try {
    localStorage.setItem(
      AUTH_EXPIRY_KEY,
      JSON.stringify({
        expiresAt,
        rememberMe,
        days,
      } as SessionExpiryMeta)
    );
  } catch (err) {
    console.error('Failed to record session expiry metadata:', err);
  }
}

/**
 * Retrieves the stored session expiry metadata.
 */
export function getSessionExpiryMeta(): SessionExpiryMeta | null {
  try {
    const raw = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionExpiryMeta;
  } catch {
    return null;
  }
}

/**
 * Checks if the current session has exceeded its maximum lifetime (5 days or 30 days).
 */
export function isSessionExpired(): boolean {
  const meta = getSessionExpiryMeta();
  if (!meta) return false;
  return Date.now() > meta.expiresAt;
}

/**
 * Clears the stored session expiry metadata.
 */
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
  } catch (err) {
    console.error('Failed to clear session expiry metadata:', err);
  }
}

/**
 * Signs in the admin user using the preconfigured email and entered password.
 */
export async function signInAdmin(
  password: string,
  rememberMe: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client is not configured. Please check your environment variables.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: password.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.session) {
      return { success: false, error: 'Could not establish authentication session.' };
    }

    recordAuthSession(rememberMe);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during login. Please try again.',
    };
  }
}

/**
 * Signs out the admin user and cleans up the session expiry metadata.
 */
export async function signOutAdmin(): Promise<void> {
  clearAuthSession();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out of Supabase:', err);
    }
  }
}
