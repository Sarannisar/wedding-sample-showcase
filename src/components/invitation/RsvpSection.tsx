import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { updateRsvp, RsvpWriteResult } from '@/lib/supabase';
import { Invitee, RsvpStatus } from '@/lib/types';
import { useReveal } from '@/lib/useReveal';
import { notify } from '@/lib/notify';
import { getRsvpWindow, RsvpWindow } from '@/lib/rsvpDeadline';
import { weddingConfig } from '@/config/weddingConfig';
import confetti from 'canvas-confetti';
import {
  Minus,
  Plus,
  Check,
  ArrowLeft,
  Heart,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Edit3,
  Clock,
  Lock,
  Phone,
} from 'lucide-react';

interface RsvpSectionProps {
  invitee: Invitee | null;
  onRsvpSuccess?: (updated: { rsvp: RsvpStatus; guestCount: number }) => void;
}

interface LocalRsvpRecord {
  slug: string;
  rsvp: RsvpStatus;
  guestCount: number;
  note?: string;
  respondedAt: string;
}

export const RsvpSection: React.FC<RsvpSectionProps> = ({ invitee, onRsvpSuccess }) => {
  const [localSaved, setLocalSaved] = useState<LocalRsvpRecord | null>(null);
  const [isOutboxPending, setIsOutboxPending] = useState(false);

  // Dynamic RSVP Window Calculation with 60s live ticker
  const [windowState, setWindowState] = useState<RsvpWindow>(() =>
    getRsvpWindow(invitee?.first_opened_at ?? invitee?.created_at)
  );

  useEffect(() => {
    setWindowState(getRsvpWindow(invitee?.first_opened_at ?? invitee?.created_at));
    const timer = setInterval(() => {
      setWindowState(getRsvpWindow(invitee?.first_opened_at ?? invitee?.created_at));
    }, 60000);
    return () => clearInterval(timer);
  }, [invitee?.first_opened_at, invitee?.created_at]);

  // Load from localStorage or DB
  useEffect(() => {
    if (!invitee?.slug) return;
    try {
      const raw = localStorage.getItem(`wedding_rsvp_${invitee.slug}`);
      if (raw) {
        const parsed: LocalRsvpRecord = JSON.parse(raw);
        setLocalSaved(parsed);
      }
      const pendingRaw = localStorage.getItem(`wedding_rsvp_pending_${invitee.slug}`);
      if (pendingRaw) {
        setIsOutboxPending(true);
      }
    } catch {
      // Ignore JSON error
    }
  }, [invitee?.slug]);

  // Determine current active RSVP status (DB wins if responded, else local)
  const isDbResponded = Boolean(invitee && invitee.rsvp && invitee.rsvp !== 'pending');
  const activeStatus: RsvpStatus = isDbResponded
    ? invitee!.rsvp
    : localSaved?.rsvp || 'pending';

  const initialCount = isDbResponded
    ? invitee!.guest_count || 1
    : localSaved?.guestCount || 1;

  const initialNote = isDbResponded
    ? invitee!.notes || ''
    : localSaved?.note || '';

  // Step 1: Selection, Step 2: Confirmation / Count / Note, Step 3: Summary / Confirmation
  const [step, setStep] = useState<number>(activeStatus === 'pending' ? 1 : 3);
  const [selectedRsvp, setSelectedRsvp] = useState<RsvpStatus>(
    activeStatus !== 'pending' ? activeStatus : 'attending'
  );
  const [guestCount, setGuestCount] = useState<number>(initialCount);
  const [note, setNote] = useState<string>(initialNote);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Update initial values if invitee prop changes
  useEffect(() => {
    if (invitee?.rsvp && invitee.rsvp !== 'pending') {
      setSelectedRsvp(invitee.rsvp);
      setGuestCount(invitee.guest_count && invitee.guest_count > 0 ? invitee.guest_count : 1);
      setNote(invitee.notes || '');
      setStep(3);
    }
  }, [invitee?.rsvp, invitee?.guest_count, invitee?.notes]);

  // Auto-retry outbox once if back online on mount
  useEffect(() => {
    if (!invitee?.slug || typeof navigator === 'undefined' || !navigator.onLine) return;
    try {
      const pendingRaw = localStorage.getItem(`wedding_rsvp_pending_${invitee.slug}`);
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        updateRsvp(
          invitee.slug,
          pending.rsvp,
          pending.guestCount,
          pending.note,
          invitee.name
        ).then((res) => {
          if (res.ok) {
            localStorage.removeItem(`wedding_rsvp_pending_${invitee.slug}`);
            setIsOutboxPending(false);
            setLocalSaved(pending);
            notify.success('Your pending RSVP has been synchronized.');
          }
        });
      }
    } catch {
      // Non-fatal
    }
  }, [invitee?.slug, invitee?.name]);

  // Online listener: notify user to tap Retry if an error was previously raised
  useEffect(() => {
    const handleOnline = () => {
      if (submitError) {
        notify.info('Back online — tap Retry to send your RSVP.');
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [submitError]);

  const handleSelectOption = (status: RsvpStatus) => {
    setSelectedRsvp(status);
    setSubmitError(null);
    setStep(2);
  };

  const handleIncrement = () => {
    if (guestCount < 20) {
      setGuestCount((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (guestCount > 1) {
      setGuestCount((prev) => prev - 1);
    }
  };

  const handleConfirm = async () => {
    if (!invitee) return;

    if (!windowState.isOpen) {
      notify.error(weddingConfig.rsvp?.lockedMessage || 'RSVP is now closed.');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      notify.error('You appear to be offline. Please reconnect to submit your RSVP.');
      setSubmitError('You are currently offline. Please check your internet connection.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const pendingRecord: LocalRsvpRecord = {
      slug: invitee.slug,
      rsvp: selectedRsvp,
      guestCount: selectedRsvp === 'attending' ? guestCount : 0,
      note: note.trim(),
      respondedAt: new Date().toISOString(),
    };

    // Save pending outbox before network request
    try {
      localStorage.setItem(`wedding_rsvp_pending_${invitee.slug}`, JSON.stringify(pendingRecord));
      setIsOutboxPending(true);
    } catch {
      // Non-fatal
    }

    try {
      const result: RsvpWriteResult = await updateRsvp(
        invitee.slug,
        selectedRsvp,
        selectedRsvp === 'attending' ? guestCount : 0,
        note.trim(),
        invitee.name
      );

      if (!result.ok) {
        setSubmitError(result.message);
        notify.error(result.message || 'Could not submit RSVP. Please tap Retry.');
        return;
      }

      // Success: clear outbox, commit confirmed cache
      try {
        localStorage.removeItem(`wedding_rsvp_pending_${invitee.slug}`);
        localStorage.setItem(`wedding_rsvp_${invitee.slug}`, JSON.stringify(pendingRecord));
        setLocalSaved(pendingRecord);
        setIsOutboxPending(false);
      } catch {
        // localStorage non-fatal
      }

      if (selectedRsvp === 'attending') {
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.7 },
            colors: ['#f2b8c6', '#f9dde5', '#e08aa3', '#fff2f6'],
          });
        }
        notify.success('Thank you! Your RSVP has been confirmed.');
      } else {
        notify.success('Thank you for letting us know.');
      }

      setStep(3);
      if (onRsvpSuccess) {
        onRsvpSuccess({
          rsvp: selectedRsvp,
          guestCount: selectedRsvp === 'attending' ? guestCount : 0,
        });
      }
    } catch (err: any) {
      console.error('Failed to submit RSVP:', err);
      const msg = err?.message || 'Unable to send RSVP. Please tap Retry to submit again.';
      setSubmitError(msg);
      notify.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const revealProps = useReveal();

  if (!windowState.isOpen) {
    return (
      <motion.section {...revealProps} className="w-full max-w-xl mx-auto my-6 px-3">
        <Card3D className="text-center py-8 px-6 sm:px-10">
          <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold block mb-1">
            RSVP STATUS
          </span>
          <h2 className="font-serif text-3xl text-[#4a3038] font-semibold mb-2">
            RSVP Closed
          </h2>

          <div className="p-6 rounded-2xl bg-[#fff6f9]/90 border border-[#f2b8c6]/30 text-center space-y-4 max-w-md mx-auto my-4">
            <div className="w-12 h-12 rounded-full bg-[#fdeef3] mx-auto flex items-center justify-center text-[#b05570]">
              <Lock className="w-6 h-6" />
            </div>

            {activeStatus === 'attending' ? (
              <>
                <h4 className="font-serif text-xl font-bold text-[#4a3038]">Attending Confirmed</h4>
                <p className="font-serif text-xs text-[#6f5860] leading-relaxed">
                  You are recorded as attending ({guestCount} {guestCount === 1 ? 'guest' : 'guests'}).
                </p>
                {note && (
                  <div className="p-3 rounded-lg bg-white border border-[#f2b8c6]/20 text-xs font-serif italic text-[#7a4d5d]">
                    "{note}"
                  </div>
                )}
              </>
            ) : activeStatus === 'declined' ? (
              <>
                <h4 className="font-serif text-xl font-bold text-[#4a3038]">Response Recorded: Declined</h4>
                <p className="font-serif text-xs text-[#6f5860] leading-relaxed">
                  Thank you for your blessings and heartfelt wishes.
                </p>
                {note && (
                  <div className="p-3 rounded-lg bg-white border border-[#f2b8c6]/20 text-xs font-serif italic text-[#7a4d5d]">
                    "{note}"
                  </div>
                )}
              </>
            ) : (
              <>
                <h4 className="font-serif text-xl font-bold text-[#4a3038]">No Response Recorded</h4>
                <p className="font-serif text-xs text-[#6f5860] leading-relaxed">
                  The RSVP window closed on{' '}
                  {windowState.deadline.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  .
                </p>
              </>
            )}

            <div className="pt-2 border-t border-[#f2b8c6]/20">
              <p className="font-serif text-xs text-[#b05570] italic leading-relaxed mb-4">
                {weddingConfig.rsvp?.lockedMessage ||
                  'RSVP is now closed. Please contact the family directly for any changes.'}
              </p>
              <a
                href="https://wa.me/94772257533?text=Assalamu%20Alaikum%20Illyas%2C%20regarding%20my%20RSVP..."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] text-white font-label text-xs uppercase tracking-wider font-semibold shadow-sm hover:brightness-105 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contact Illyas (0772257533)</span>
              </a>
            </div>
          </div>
        </Card3D>
      </motion.section>
    );
  }

  return (
    <motion.section
      {...revealProps}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-6 sm:px-10">
        {/* Soft urgency pill when <= 72 hours remaining */}
        {windowState.hoursRemaining <= 72 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdeef3] border border-[#f2b8c6]/40 text-[11px] font-label font-semibold text-[#b05570] uppercase tracking-wider mb-4 motion-safe:animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Please respond by{' '}
              {windowState.deadline.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Outbox pending badge */}
        {isOutboxPending && (
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-label uppercase tracking-wider font-semibold">
            <span>⚠️ Not sent yet (will auto-send once online)</span>
          </div>
        )}

        {/* RSVP Header */}
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold block mb-1">
          KINDLY RESPOND
        </span>
        <h2 className="font-serif text-3xl text-[#4a3038] font-semibold mb-2">
          RSVP
        </h2>
        <p className="font-label text-xs uppercase tracking-[0.25em] text-[#7a4d5d] font-semibold mb-6">
          WILL YOU JOIN US?
        </p>

        <AnimatePresence mode="wait">
          {/* STEP 1: YES / NO BUTTONS */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto"
            >
              <button
                onClick={() => handleSelectOption('attending')}
                className="py-4 px-5 rounded-xl border border-[#f2b8c6] bg-[#fff6f9] text-[#4a3038] hover:bg-[#f2b8c6]/20 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs font-serif text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#e08aa3]"
              >
                <span>✨</span>
                <span>Yes, with joy</span>
              </button>

              <button
                onClick={() => handleSelectOption('declined')}
                className="py-4 px-5 rounded-xl border border-[#f2b8c6] bg-[#fff6f9] text-[#4a3038] hover:bg-[#f2b8c6]/20 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs font-serif text-sm font-medium focus-visible:ring-2 focus-visible:ring-[#e08aa3]"
              >
                <span>🌸</span>
                <span>Regretfully no</span>
              </button>
            </motion.div>
          )}

          {/* STEP 2: GUEST COUNT & OPTIONAL NOTE */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto space-y-5 text-left"
            >
              {selectedRsvp === 'attending' ? (
                <div className="p-4 rounded-xl bg-[#fff6f9]/90 border border-[#f2b8c6]/25 text-center">
                  <span className="font-label text-xs uppercase tracking-wider text-[#a8808e] block mb-3 font-semibold">
                    Number of Guests (1–20)
                  </span>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={handleDecrement}
                      disabled={guestCount <= 1}
                      className="w-10 h-10 rounded-full bg-white border border-[#f2b8c6]/40 text-[#a8808e] flex items-center justify-center shadow-xs active:scale-95 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="font-serif text-3xl font-bold text-[#4a3038] w-14 text-center tabular-nums">
                      {guestCount}
                    </span>

                    <button
                      onClick={handleIncrement}
                      disabled={guestCount >= 20}
                      className="w-10 h-10 rounded-full bg-white border border-[#f2b8c6]/40 text-[#a8808e] flex items-center justify-center shadow-xs active:scale-95 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#fff6f9]/90 border border-[#f2b8c6]/25 text-center">
                  <p className="font-serif text-xs text-[#6f5860] leading-relaxed">
                    We will miss your presence on our special day. Your heartfelt prayers and
                    blessings are warmly appreciated.
                  </p>
                </div>
              )}

              {/* Optional Note / Dua Box */}
              <div className="p-4 rounded-xl bg-[#fff6f9]/90 border border-[#f2b8c6]/25">
                <div className="flex items-center gap-2 mb-2 text-[#a8808e]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <label htmlFor="rsvp-note-input" className="font-label text-xs uppercase tracking-wider font-semibold cursor-pointer">
                    Add a Note or Dua (Optional)
                  </label>
                </div>
                <textarea
                  id="rsvp-note-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Share a warm wish, dua, dietary requirement, or message for Safiyya & Sharrafuth..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-[#f2b8c6]/30 bg-white text-xs font-serif text-[#4a3038] placeholder:text-[#b592a0]/60 focus:outline-none focus:border-[#f2b8c6] resize-none"
                />
              </div>

              {/* Submit Error Message */}
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-body flex items-center justify-between">
                  <span>{submitError}</span>
                  <button
                    onClick={handleConfirm}
                    className="font-semibold underline ml-2 hover:text-rose-900"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-xl border border-[#f2b8c6]/40 text-[#a8808e] font-label text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#fff6f9] cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-6 rounded-xl bg-[#e08aa3] text-white font-label text-xs uppercase tracking-wider font-semibold shadow hover:bg-[#b05570] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 motion-safe:animate-spin" />
                      <span>Sending RSVP...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm RSVP</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SUMMARY / CONFIRMATION MESSAGE (Summary state for returning visits) */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-2xl bg-[#fff6f9]/90 border border-[#f2b8c6]/30 text-center space-y-4 max-w-md mx-auto"
            >
              {selectedRsvp === 'attending' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#fdeef3] mx-auto flex items-center justify-center text-[#e08aa3]">
                    <Sparkles className="w-6 h-6 motion-safe:animate-pulse" />
                  </div>
                  <h4 className="font-serif text-xl font-bold text-[#4a3038]">
                    You're Attending!
                  </h4>
                  <p className="font-serif text-xs text-[#6f5860] leading-relaxed">
                    We look forward to welcoming you and your family ({guestCount}{' '}
                    {guestCount === 1 ? 'guest' : 'guests'}) on Saturday, 12th December 2026.
                  </p>
                  {note && (
                    <div className="p-3 rounded-lg bg-white border border-[#f2b8c6]/20 text-xs font-serif italic text-[#a8808e]">
                      "{note}"
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#fdeef3] mx-auto flex items-center justify-center text-[#a8808e]">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-xl font-bold text-[#4a3038]">
                    Thank You for Your Blessings
                  </h4>
                  <p className="font-serif text-xs text-[#6f5860] leading-relaxed">
                    Your thoughtful wishes and prayers for Safiyya & Sharrafuth are deeply cherished.
                  </p>
                  {note && (
                    <div className="p-3 rounded-lg bg-white border border-[#f2b8c6]/20 text-xs font-serif italic text-[#a8808e]">
                      "{note}"
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#e08aa3]/30 text-xs font-label uppercase tracking-widest text-[#b05570] hover:bg-[#fff2f6] transition cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Change response</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card3D>
    </motion.section>
  );
};
