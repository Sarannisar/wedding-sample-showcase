import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { updateRsvp } from '@/lib/supabase';
import { Invitee, RsvpStatus } from '@/lib/types';
import confetti from 'canvas-confetti';
import { Minus, Plus, Check, ArrowLeft, Heart, Sparkles, MessageSquare } from 'lucide-react';

interface RsvpSectionProps {
  invitee: Invitee | null;
  onRsvpSuccess?: (updated: { rsvp: RsvpStatus; guestCount: number }) => void;
}

export const RsvpSection: React.FC<RsvpSectionProps> = ({ invitee, onRsvpSuccess }) => {
  const currentStatus = invitee?.rsvp || 'pending';
  const initialCount = invitee?.guest_count && invitee.guest_count > 0 ? invitee.guest_count : 1;
  const initialNote = invitee?.notes || '';

  // Step 1: Selection, Step 2: Confirmation / Count / Note, Step 3: Completed Thank You
  const [step, setStep] = useState<number>(currentStatus === 'pending' ? 1 : 3);
  const [selectedRsvp, setSelectedRsvp] = useState<RsvpStatus>(
    currentStatus !== 'pending' ? currentStatus : 'attending'
  );
  const [guestCount, setGuestCount] = useState<number>(initialCount);
  const [note, setNote] = useState<string>(initialNote);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelectOption = (status: RsvpStatus) => {
    setSelectedRsvp(status);
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
    setIsSubmitting(true);

    try {
      await updateRsvp(
        invitee.slug,
        selectedRsvp,
        selectedRsvp === 'attending' ? guestCount : 0,
        note.trim()
      );

      if (selectedRsvp === 'attending') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#c59b6d', '#e8d4be', '#b05570', '#fdf0f3'],
        });
      }

      setStep(3);
      if (onRsvpSuccess) {
        onRsvpSuccess({ rsvp: selectedRsvp, guestCount });
      }
    } catch (err) {
      console.error('Failed to submit RSVP:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-6 sm:px-10">
        {/* RSVP Header */}
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#a07855] font-semibold block mb-1">
          KINDLY RESPOND
        </span>
        <h3 className="font-serif text-3xl text-[#2d1a22] font-semibold mb-2">
          RSVP
        </h3>
        <p className="font-label text-xs uppercase tracking-[0.25em] text-[#8c6d58] font-semibold mb-6">
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
                className="py-4 px-5 rounded-xl border border-[#c59b6d] bg-[#fbf8f2] text-[#2d1a22] hover:bg-[#c59b6d]/15 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs font-serif text-sm font-medium"
              >
                <span>✨</span>
                <span>Yes, with joy</span>
              </button>

              <button
                onClick={() => handleSelectOption('declined')}
                className="py-4 px-5 rounded-xl border border-[#c59b6d] bg-[#fbf8f2] text-[#2d1a22] hover:bg-[#c59b6d]/15 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs font-serif text-sm font-medium"
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
                <div className="p-4 rounded-xl bg-[#fbf8f2]/90 border border-[#c59b6d]/25 text-center">
                  <span className="font-label text-xs uppercase tracking-wider text-[#8c6d58] block mb-3 font-semibold">
                    Number of Guests (1–20)
                  </span>
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={handleDecrement}
                      disabled={guestCount <= 1}
                      className="w-10 h-10 rounded-full bg-white border border-[#c59b6d]/40 text-[#8c6d58] flex items-center justify-center shadow-xs active:scale-95 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="font-serif text-3xl font-bold text-[#2d1a22] w-14 text-center tabular-nums">
                      {guestCount}
                    </span>

                    <button
                      onClick={handleIncrement}
                      disabled={guestCount >= 20}
                      className="w-10 h-10 rounded-full bg-white border border-[#c59b6d]/40 text-[#8c6d58] flex items-center justify-center shadow-xs active:scale-95 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#fbf8f2]/90 border border-[#c59b6d]/25 text-center">
                  <p className="font-serif text-xs text-[#5c4a42] leading-relaxed">
                    We will miss your presence on our special day. Your heartfelt prayers and
                    blessings are warmly appreciated.
                  </p>
                </div>
              )}

              {/* Optional Note / Dua Box */}
              <div className="p-4 rounded-xl bg-[#fbf8f2]/90 border border-[#c59b6d]/25">
                <div className="flex items-center gap-2 mb-2 text-[#8c6d58]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <label className="font-label text-xs uppercase tracking-wider font-semibold">
                    Add a Note or Dua (Optional)
                  </label>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Share a warm wish, dua, or message for Sharrafuth & Safiyya..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-[#c59b6d]/30 bg-white text-xs font-serif text-[#2d1a22] placeholder:text-[#9a7080]/60 focus:outline-none focus:border-[#c59b6d] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl border border-[#c59b6d]/40 text-[#8c6d58] font-label text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#fbf8f2] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-6 rounded-xl bg-[#c59b6d] text-white font-label text-xs uppercase tracking-wider font-semibold shadow hover:bg-[#b0885c] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirming...' : 'Confirm RSVP'}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONFIRMATION MESSAGE */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="p-5 rounded-2xl bg-[#fbf8f2]/90 border border-[#c59b6d]/30 text-center space-y-3 max-w-md mx-auto"
            >
              {selectedRsvp === 'attending' ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#f4ece1] mx-auto flex items-center justify-center text-[#c59b6d]">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-[#2d1a22]">
                    Thank You for Celebrating With Us!
                  </h4>
                  <p className="font-serif text-xs text-[#5c4a42]">
                    We look forward to welcoming you and your family ({guestCount}{' '}
                    {guestCount === 1 ? 'guest' : 'guests'}) on Saturday, 12th December 2026.
                  </p>
                  {note && (
                    <div className="p-3 rounded-lg bg-white border border-[#c59b6d]/20 text-xs font-serif italic text-[#8c6d58]">
                      "{note}"
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#f4ece1] mx-auto flex items-center justify-center text-[#8c6d58]">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-[#2d1a22]">
                    Thank You for Your Blessings
                  </h4>
                  <p className="font-serif text-xs text-[#5c4a42]">
                    Your thoughtful wishes and prayers for the couple are deeply cherished.
                  </p>
                  {note && (
                    <div className="p-3 rounded-lg bg-white border border-[#c59b6d]/20 text-xs font-serif italic text-[#8c6d58]">
                      "{note}"
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => setStep(1)}
                className="mt-3 text-xs font-label uppercase tracking-widest text-[#a07855] hover:underline cursor-pointer"
              >
                Change Response
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card3D>
    </motion.section>
  );
};
