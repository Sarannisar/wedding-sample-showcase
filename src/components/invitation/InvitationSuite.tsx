import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
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
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
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
  const scrollTweenRef = React.useRef<gsap.core.Tween | null>(null);

  const smoothScrollToDivider = () => {
    if (!postCountdownDividerRef.current) return;
    const rect = postCountdownDividerRef.current.getBoundingClientRect();
    const targetY = window.scrollY + rect.bottom - window.innerHeight + 36;

    if (targetY > window.scrollY + 10) {
      if (scrollTweenRef.current) {
        scrollTweenRef.current.kill();
      }

      const scrollObj = { y: window.scrollY };
      scrollTweenRef.current = gsap.to(scrollObj, {
        y: targetY,
        duration: 0.85, // Balanced, responsive smooth pace
        ease: 'power2.out',
        onUpdate: () => {
          window.scrollTo(0, scrollObj.y);
        },
      });
    }
  };

  const handleDateRevealed = () => {
    setIsDateRevealed(true);
    // Smoothly scroll down right as countdown starts revealing
    setTimeout(() => {
      smoothScrollToDivider();
    }, 120);
  };

  const handleCountdownAnimationComplete = () => {
    smoothScrollToDivider();
  };

  return (
    <div className="relative z-20 w-full min-h-screen py-10 px-2 sm:px-4 flex flex-col items-center">
      {/* Sacred Spiritual Prelude Card: Surah Ar-Rum (30:21) */}
      <ErrorBoundary compact fallbackTitle="Spiritual Blessing">
        <BlessingSection />
      </ErrorBoundary>

      <FloralDivider className="my-6" />

      {/* Main Stationery Hero */}
      <ErrorBoundary compact fallbackTitle="Wedding Invitation">
        <HeroSection guestName={invitee?.name} />
      </ErrorBoundary>

      <FloralDivider className="my-6" />

      {/* Interactive Gold Date Scratch-to-Reveal Card (with Insha Allah badge) */}
      <ErrorBoundary compact fallbackTitle="Date & Time Card">
        <DateScratchCard
          isRevealed={isDateRevealed}
          onRevealed={handleDateRevealed}
          inviteeId={invitee?.id}
        />
      </ErrorBoundary>

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
            <ErrorBoundary compact fallbackTitle="Wedding Countdown">
              <CountdownSection />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Divider after Countdown */}
      <div ref={postCountdownDividerRef} className="w-full flex justify-center scroll-mt-6">
        <FloralDivider className="my-6" />
      </div>

      {/* 3D Tactile Event Location Card with Google Maps */}
      <ErrorBoundary compact fallbackTitle="Venue & Location">
        <EventCardSection inviteeId={invitee?.id} />
      </ErrorBoundary>

      {/* Interactive RSVP Flow with Optional Note/Dua (only if personalized invitee or RSVP enabled) */}
      {showRsvp && (
        <>
          <FloralDivider className="my-6" />
          <ErrorBoundary compact fallbackTitle="RSVP Section">
            <RsvpSection invitee={invitee} onRsvpSuccess={onRsvpSuccess} />
          </ErrorBoundary>
        </>
      )}

      <FloralDivider className="my-6" />

      {/* Directions & Family Contact */}
      <ErrorBoundary compact fallbackTitle="Contact & Directions">
        <ContactSection />
      </ErrorBoundary>

      <FloralDivider className="my-6" />

      {/* Closing Arabic Dua, Translation & Ameen */}
      <ErrorBoundary compact fallbackTitle="Closing Blessing">
        <ClosingSection />
      </ErrorBoundary>

      {/* Artisan Colophon & Direct WhatsApp Inquiry */}
      <footer className="w-full flex flex-col items-center justify-center pt-8 pb-3 text-center">
        <a
          href="https://wa.me/94721125255?text=Hi%20BIZZIMAX%2C%20I%20saw%20Safiyya%20%26%20Sharrafuth%27s%20wedding%20invitation%20and%20would%20like%20to%20inquire%20about%20a%20digital%20invitation."
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#e08aa3]/20 bg-white/40 hover:bg-white/80 hover:border-[#e08aa3]/40 transition-all duration-300 shadow-xs"
          title="Inquire about a bespoke digital invitation on WhatsApp"
        >
          <span className="text-[10px] sm:text-[11px] font-label uppercase tracking-[0.2em] text-[#b592a0] group-hover:text-[#b05570] transition-colors font-medium">
            Digital Invitation by <strong className="font-bold text-[#8a3852]">BIZZIMAX</strong>
          </span>
          <span className="text-[#b592a0]/60 text-[10px]">•</span>
          <span className="text-[10px] sm:text-[11px] font-label tracking-wider text-[#b05570] group-hover:underline font-semibold font-mono">
            0721125255
          </span>
        </a>
      </footer>

      {/* Gentle periodic nudge to keep scrolling to the very bottom */}
      <ScrollGuide />
    </div>
  );
};
