/**
 * Link helpers for sharing invitations.
 *
 * The invitation is a single-page app, so a plain /invite/<slug> link cannot
 * show a personalised preview card in WhatsApp. The backend preview function
 * renders per-guest metadata and immediately forwards the guest to the real
 * invitation page, so we use it as the shared link.
 */

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');

export function getSiteOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** Direct link to the invitation page (used for copy-link / QR). */
export function getInviteUrl(slug: string): string {
  return `${getSiteOrigin()}/invite/${encodeURIComponent(slug)}`;
}

/**
 * Link used inside WhatsApp / social messages so the preview card shows the
 * guest's own name. Falls back to the direct link when no backend is set up.
 */
export function getShareableInviteUrl(slug: string): string {
  const origin = getSiteOrigin();
  const isLocal = /localhost|127\.0\.0\.1/.test(origin);
  if (!rawSupabaseUrl || isLocal) return getInviteUrl(slug);
  return `${rawSupabaseUrl}/functions/v1/invite-preview?s=${encodeURIComponent(
    slug
  )}&o=${encodeURIComponent(origin)}`;
}
