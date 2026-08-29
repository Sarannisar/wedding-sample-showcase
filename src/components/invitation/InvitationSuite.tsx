import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroSection } from './HeroSection';
import { VideoSection } from './VideoSection';
import { ScrollGuide } from './ScrollGuide';
import { DateScratchCard } from './DateScratchCard';
import { CountdownSection } from './CountdownSection';
import { EventCardSection } from './EventCardSection';
import { RsvpSection } from './RsvpSection';
import { ContactSection } from './ContactSection';
import { ClosingSection } from './ClosingSection';
import { Invitee, RsvpStatus } from '@/lib/types';

interface InvitationSuiteProps {
  invitee: Invitee | null;
  onRsvpSuccess?: (updated: { rsvp: RsvpStatus; guestCount: number }) => void;
}

export const InvitationSuite: React.FC<InvitationSuiteProps> = ({
  invitee,
  onRsvpSuccess,
}) => {
  const [isDateRevealed, setIsDateRevealed] = useState(false);

  return (
    <div className="relative z-20 w-full min-h-screen py-10 px-2 sm:px-4 flex flex-col items-center">
      {/* Main Stationery Hero */}
      <HeroSection guestName={invitee?.name} />

      {/* Personal Video Message */}
      <VideoSection />

      {/* Interactive Gold Date Scratch-to-Reveal Card (with Insha Allah badge) */}
      <DateScratchCard
        isRevealed={isDateRevealed}
        onRevealed={() => setIsDateRevealed(true)}
      />

      {/* Live Countdown Timer - Only shown after date is scratched/revealed */}
      <AnimatePresence>
        {isDateRevealed && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center"
          >
            <CountdownSection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Tactile Event Location Card with Google Maps */}
      <EventCardSection />

      {/* Interactive RSVP Flow with Optional Note/Dua */}
      <RsvpSection invitee={invitee} onRsvpSuccess={onRsvpSuccess} />

      {/* Directions & Family Contact */}
      <ContactSection />

      {/* Closing Arabic Dua, Translation & Ameen */}
      <ClosingSection />

      {/* Gentle periodic nudge to keep scrolling to the very bottom */}
      <ScrollGuide />
    </div>
  );
};
