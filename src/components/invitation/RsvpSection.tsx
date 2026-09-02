import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { updateRsvp } from '@/lib/supabase';
import { Invitee, RsvpStatus } from '@/lib/types';
import { useReveal } from '@/lib/useReveal';
import { notify } from '@/lib/notify';
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

  // Load from localStorage or DB
  useEffect(() => {
    if (!invitee?.slug) return;
    try {
      const raw = localStorage.getItem(`wedding_rsvp_${invitee.slug}`);
      if (raw) {
        const parsed: LocalRsvpRecord = JSON.parse(raw);
        setLocalSaved(parsed);
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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      notify.error('You appear to be offline. Please reconnect to submit your RSVP.');
      setSubmitError('You are currently offline. Please check your internet connection.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const success = await updateRsvp(
        invitee.slug,
        selectedRsvp,
        selectedRsvp === 'attending' ? guestCount : 0,
        note.trim(),
        invitee.name
      );

      if (!success) {
        throw new Error('Failed to record response in database.');
      }

      // Save to localStorage
      const record: LocalRsvpRecord = {
        slug: invitee.slug,
        rsvp: selectedRsvp,
        guestCount: selectedRsvp === 'attending' ? guestCount : 0,
        note: note.trim(),
        respondedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(`wedding_rsvp_${invitee.slug}`, JSON.stringify(record));
        setLocalSaved(record);
      } catch {
        // localStorage non-fatal
      }

      if (selectedRsvp === 'attending') {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.7 },
          colors: ['#f2b8c6', '#f9dde5', '#e08aa3', '#fff2f6'],
        });
        notify.success('Thank you! Your RSVP has been confirmed.');
      } else {
        notify.success('Thank you for letting us know.');
      }

      setStep(3);
      if (onRsvpSuccess) {
        onRsvpSuccess({ rsvp: selectedRsvp, guestCount });
      }
    } catch (err: any) {
      console.error('Failed to submit RSVP:', err);
      setSubmitError('Unable to send RSVP. Please tap Retry to submit again.');
      notify.error('Could not submit RSVP. Please tap Retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const revealProps = useReveal();

  return (
    <motion.section
      {...revealProps}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-6 sm:px-10">
        {/* RSVP Header */}
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold block mb-1">
          KINDLY RESPOND
        </span>
        <h2 className="font-serif text-3xl text-[#4a3038] font-semibold mb-2">
          RSVP
        </h2>
        <p className="font-label text-xs uppercase tracking-[0.25em] text-[#a8808e] font-semibold mb-6">
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
                  <label className="font-label text-xs uppercase tracking-wider font-semibold">
                    Add a Note or Dua (Optional)
                  </label>
                </div>
                <textarea
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
                      <RefreshCw className="w-4 h-4 animate-spin" />
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
                    <Sparkles className="w-6 h-6 animate-pulse" />
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
