/**
 * Link helpers for sharing invitations.
 *
 * The invitation is a single-page app, so a plain /invite/<slug> link cannot
 * show a personalised preview card in WhatsApp. The backend preview function
 * renders per-guest metadata and immediately forwards the guest to the real
 * invitation page, so we use it as the shared link.
 */

import { weddingConfig } from '@/config/weddingConfig';

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

export interface HostRsvpNudgeParams {
  hostPhone: string;
  guestName: string;
  rsvp: 'attending' | 'declined' | string;
  guestCount: number;
  notes?: string | null;
}

export function getHostRsvpWhatsAppUrl({
  hostPhone,
  guestName,
  rsvp,
  guestCount,
  notes,
}: HostRsvpNudgeParams): string {
  const cleanPhone = hostPhone.replace(/\D/g, '');
  const isAttending = rsvp === 'attending';

  const defaultAttending =
    `Assalamu Alaikum! I have confirmed my RSVP for ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}'s Wedding Ceremony on ${weddingConfig.event.dayAndDate}.\n\n👤 Guest: GUEST_NAME\n✅ Status: Attending (GUEST_COUNT)\n📝 Notes: NOTES\n\nLooking forward to celebrating with you insha Allah!`;

  const defaultDeclined =
    `Assalamu Alaikum! Regretfully I am unable to attend ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}'s Wedding Ceremony on ${weddingConfig.event.dayAndDate}.\n\n👤 Guest: GUEST_NAME\n❌ Status: Regretfully Declined\n📝 Notes: NOTES\n\nWishing you both immense blessings and happiness insha Allah!`;

  const rawTemplate = isAttending
    ? weddingConfig.whatsapp?.hostConfirmationAttendingTemplate || defaultAttending
    : weddingConfig.whatsapp?.hostConfirmationDeclinedTemplate || defaultDeclined;

  const countText = `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}`;
  const notesText = notes?.trim() || 'None';

  const message = rawTemplate
    .replace(/GUEST_NAME/g, guestName)
    .replace(/GUEST_COUNT/g, countText)
    .replace(/NOTES/g, notesText);

  return `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}
