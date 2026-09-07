import { weddingConfig } from '@/config/weddingConfig';

export interface RsvpWindow {
  deadline: Date;
  isLate: boolean; // guest fell into the final-week bucket
  isOpen: boolean;
  hoursRemaining: number;
}

/**
 * Calculates the effective RSVP deadline and window for a guest.
 * 
 * Rules:
 * - STANDARD_DEADLINE = EVENT - 7 days
 * - LATE_DEADLINE = EVENT - 1 day
 * - If anchor < STANDARD_DEADLINE: effective deadline is STANDARD_DEADLINE
 * - If anchor >= STANDARD_DEADLINE: effective deadline is LATE_DEADLINE
 * 
 * @param anchorIso ISO string of first_opened_at, falling back to created_at, then now.
 * @param now Current reference time (defaults to new Date())
 */
export function getRsvpWindow(anchorIso?: string | null, now = new Date()): RsvpWindow {
  const eventTime = new Date(weddingConfig.event.targetDate).getTime();
  const standardCutoffDays = weddingConfig.rsvp?.standardCutoffDaysBefore ?? 7;
  const lateCutoffDays = weddingConfig.rsvp?.lateCutoffDaysBefore ?? 1;

  const standardDeadline = new Date(eventTime - standardCutoffDays * 24 * 60 * 60 * 1000);
  const lateDeadline = new Date(eventTime - lateCutoffDays * 24 * 60 * 60 * 1000);

  const anchorTime = anchorIso ? new Date(anchorIso).getTime() : now.getTime();
  const isLate = anchorTime >= standardDeadline.getTime();

  const deadline = isLate ? lateDeadline : standardDeadline;
  const msRemaining = deadline.getTime() - now.getTime();
  const isOpen = msRemaining > 0;
  const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));

  return {
    deadline,
    isLate,
    isOpen,
    hoursRemaining,
  };
}
