import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlessingSection } from './BlessingSection';
import { HeroSection } from './HeroSection';
import { ScrollGuide } from './ScrollGuide';
import { DateScratchCard } from './DateScratchCard';
import { CountdownSection } from './CountdownSection';
import { EventCardSection } from './EventCardSection';
import { RsvpSection } from './RsvpSection';
import { ContactSection } from './ContactSection';
import { ClosingSection } from './ClosingSection';
import { FloralDivider } from '@/components/common/FloralDivider';
import { Invitee, RsvpStatus } from '@/lib/types';

interface InvitationSuiteProps {
  invitee: Invitee | null;
  showRsvp?: boolean;
  onRsvpSuccess?: (updated: { rsvp: RsvpStatus; guestCount: number }) => void;
}

export const InvitationSuite: React.FC<InvitationSuiteProps> = ({
  invitee,
  showRsvp = true,
  onRsvpSuccess,
}) => {
  const [isDateRevealed, setIsDateRevealed] = useState(false);
  const postCountdownDividerRef = React.useRef<HTMLDivElement>(null);

  const handleDateRevealed = () => {
    setIsDateRevealed(true);
    // Give the countdown height animation a moment to start/expand, then check view bounds
    setTimeout(() => {
      if (postCountdownDividerRef.current) {
        const rect = postCountdownDividerRef.current.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 20) {
          postCountdownDividerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
        }
      }
    }, 400);
  };

  const handleCountdownAnimationComplete = () => {
    if (postCountdownDividerRef.current) {
      const rect = postCountdownDividerRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 10) {
        postCountdownDividerRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }
  };

  return (
    <div className="relative z-20 w-full min-h-screen py-10 px-2 sm:px-4 flex flex-col items-center">
      {/* Sacred Spiritual Prelude Card: Surah Ar-Rum (30:21) */}
      <BlessingSection />

      <FloralDivider className="my-6" />

      {/* Main Stationery Hero */}
      <HeroSection guestName={invitee?.name} />

      <FloralDivider className="my-6" />

      {/* Interactive Gold Date Scratch-to-Reveal Card (with Insha Allah badge) */}
      <DateScratchCard
        isRevealed={isDateRevealed}
        onRevealed={handleDateRevealed}
      />

      {/* Live Countdown Timer - Only shown after date is scratched/revealed */}
      <AnimatePresence>
        {isDateRevealed && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={handleCountdownAnimationComplete}
            className="w-full flex justify-center"
          >
            <CountdownSection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Divider after Countdown */}
      <div ref={postCountdownDividerRef} className="w-full flex justify-center scroll-mt-6">
        <FloralDivider className="my-6" />
      </div>

      {/* 3D Tactile Event Location Card with Google Maps */}
      <EventCardSection />

      {/* Interactive RSVP Flow with Optional Note/Dua (only if personalized invitee or RSVP enabled) */}
      {showRsvp && (
        <>
          <FloralDivider className="my-6" />
          <RsvpSection invitee={invitee} onRsvpSuccess={onRsvpSuccess} />
        </>
      )}

      <FloralDivider className="my-6" />

      {/* Directions & Family Contact */}
      <ContactSection />

      <FloralDivider className="my-6" />

      {/* Closing Arabic Dua, Translation & Ameen */}
      <ClosingSection />

      {/* Gentle periodic nudge to keep scrolling to the very bottom */}
      <ScrollGuide />
    </div>
  );
};
