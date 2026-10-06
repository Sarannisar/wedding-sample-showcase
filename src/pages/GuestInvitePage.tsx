import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FloralLoader } from '@/components/loader/FloralLoader';
import { OpeningExperience } from '@/components/opening/OpeningExperience';
import { InvitationSuite } from '@/components/invitation/InvitationSuite';
import { WatercolorBackground } from '@/components/ambient/WatercolorBackground';
import { AmbientPetals } from '@/components/ambient/AmbientPetals';
import { fetchInviteeBySlug, logInviteeEvent, ensureFirstOpenedAt } from '@/lib/supabase';
import { Invitee, RsvpStatus } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { BackgroundMusic } from '@/components/audio/BackgroundMusic';
import { weddingConfig } from '@/config/weddingConfig';
import { WifiOff, Wifi } from 'lucide-react';

export const GuestInvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [loadingStep, setLoadingStep] = useState<'loader' | 'opening' | 'invitation'>('loader');
  const [musicStarted, setMusicStarted] = useState(false);
  const [isInvalidSlug, setIsInvalidSlug] = useState(!slug);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [backOnlineToast, setBackOnlineToast] = useState(false);

  // Offline / Online listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setBackOnlineToast(true);
      setTimeout(() => setBackOnlineToast(false), 2500);
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Lock page scrolling during initial loader and opening experience
  useEffect(() => {
    if (loadingStep !== 'invitation') {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const timer = setTimeout(() => {
        document.body.style.overflow = '';
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [loadingStep]);

  // Load guest details & log opened event (guarded with sessionStorage)
  useEffect(() => {
    async function loadGuest() {
      if (slug) {
        const data = await fetchInviteeBySlug(slug);
        if (data) {
          setInvitee(data);
          setIsInvalidSlug(false);

          // Log opened event once per session and ensure deadline anchor is saved
          const sessionKey = `invite_opened_${slug}`;
          if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, '1');
            void logInviteeEvent(data.id, 'opened');
            void ensureFirstOpenedAt(data.id);
          }
        } else {
          // Slug was provided but does not exist in records
          setIsInvalidSlug(true);
        }
      } else {
        // /invite with no slug -> strictly require personalized invitation
        setInvitee(null);
        setIsInvalidSlug(true);
      }
    }
    void loadGuest();
  }, [slug]);

  const handleRsvpSuccess = (updated: { rsvp: RsvpStatus; guestCount: number }) => {
    if (invitee) {
      setInvitee({
        ...invitee,
        rsvp: updated.rsvp,
        guest_count: updated.guestCount,
        responded_at: new Date().toISOString(),
      });
    }
  };

  const guestDisplayName = invitee?.name || (slug && !isInvalidSlug ? 'Honored Guest' : '');

  // Per-guest page title / social preview metadata
  useEffect(() => {
    if (isInvalidSlug) {
      document.title = `Wedding Invitation — ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}`;
      return;
    }

    const title = guestDisplayName
      ? `Invitation for ${guestDisplayName} — ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}`
      : `Wedding Invitation — ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}`;

    const description = guestDisplayName
      ? `${guestDisplayName}, you are cordially invited to the wedding ceremony of ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}.`
      : `Wedding Invitation — ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}.`;

    document.title = title;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  }, [guestDisplayName, isInvalidSlug]);

  // Invalid Slug Privacy Card View (Step 19 #3)
  if (isInvalidSlug) {
    return (
      <div className="min-h-screen bg-[#fffafc] flex items-center justify-center p-6 text-[#4a3038] relative overflow-hidden">
        <WatercolorBackground />
        <AmbientPetals />

        <div className="max-w-md w-full p-8 sm:p-10 text-center rounded-3xl bg-white/95 backdrop-blur-md border border-[#e08aa3]/30 shadow-card-3d relative z-20 space-y-6">
          {/* Subtle Bismillah Calligraphy */}
          <p className="font-arabic text-lg text-[#b05570]/80">
            {weddingConfig.cultural.bismillah.arabic}
          </p>
          <div>
            <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e08aa3] font-bold block mb-1.5">
              Wedding Celebration
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#4a3038]">
              {weddingConfig.couple.bride} & {weddingConfig.couple.groom}
            </h2>
          </div>

          {/* Gold & Rose Decorative Divider */}
          <div className="flex items-center justify-center gap-3 my-2">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#e08aa3]" />
            <span className="text-[#b05570] text-xs">✦</span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#e08aa3]" />
          </div>

          {/* Private Notice Card */}
          <div className="p-5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/25 space-y-2.5 text-xs font-body text-[#704655] leading-relaxed">
            <p className="font-display font-bold text-sm text-[#4a3038]">
              Personalized Invitation Required
            </p>
            <p>
              This link is invalid or has expired. Attendance at the wedding celebration is strictly by personal invitation.
            </p>
            <p className="text-[11px] text-[#a8808e] pt-1">
              If you are an invited guest, please contact the host family directly to receive your personalized link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#fffafc] overflow-x-hidden text-[#4a3038]">
      {/* Non-Disruptive Floating Offline / Online Status Pill (Item 10) */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            key="offline-pill"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-full px-4 py-2 bg-amber-600/95 text-white text-xs font-label uppercase tracking-wider flex items-center gap-2 shadow-xl backdrop-blur-md"
          >
            <WifiOff className="w-4 h-4" />
            <span>You are currently offline</span>
          </motion.div>
        )}
        {backOnlineToast && (
          <motion.div
            key="online-pill"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-full px-4 py-2 bg-emerald-600/95 text-white text-xs font-label uppercase tracking-wider flex items-center gap-2 shadow-xl backdrop-blur-md"
          >
            <Wifi className="w-4 h-4" />
            <span>Back online</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Watercolor Background */}
      <WatercolorBackground />

      {/* Ambient Drifting Rose Petals */}
      <AmbientPetals />

      {/* Opening Portal Experience */}
      {loadingStep !== 'invitation' && (
        <OpeningExperience
          key="opening"
          guestName={guestDisplayName}
          onDoorsOpening={() => setMusicStarted(true)}
          onOpenComplete={() => {
            setLoadingStep('invitation');
          }}
        />
      )}

      {/* Initial Monogram Reveal Loader */}
      <AnimatePresence>
        {loadingStep === 'loader' && (
          <FloralLoader
            key="loader"
            guestName={guestDisplayName}
            onComplete={() => setLoadingStep('opening')}
          />
        )}
      </AnimatePresence>

      {/* Main Invitation Suite */}
      {loadingStep !== 'loader' && (
        <div className="w-full">
          <InvitationSuite
            invitee={invitee}
            showRsvp={Boolean(invitee)}
            onRsvpSuccess={handleRsvpSuccess}
          />
        </div>
      )}

      {/* Background music */}
      <BackgroundMusic active={musicStarted} />
    </div>
  );
};
