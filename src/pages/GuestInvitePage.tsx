import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FloralLoader } from '@/components/loader/FloralLoader';
import { OpeningExperience } from '@/components/opening/OpeningExperience';
import { InvitationSuite } from '@/components/invitation/InvitationSuite';
import { WatercolorBackground } from '@/components/ambient/WatercolorBackground';
import { AmbientPetals } from '@/components/ambient/AmbientPetals';
import { fetchInviteeBySlug } from '@/lib/supabase';
import { Invitee, RsvpStatus } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
import { BackgroundMusic } from '@/components/audio/BackgroundMusic';

export const GuestInvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [loadingStep, setLoadingStep] = useState<'loader' | 'opening' | 'invitation'>('loader');
  const [musicStarted, setMusicStarted] = useState(false);

  const [isScrollUnlocked, setIsScrollUnlocked] = useState(false);

  // Lock page scrolling during initial loader and until user begins entering invitation
  useEffect(() => {
    const locked = !isScrollUnlocked && loadingStep !== 'invitation';
    if (locked) {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [loadingStep, isScrollUnlocked]);

  useEffect(() => {
    async function loadGuest() {
      if (slug) {
        const data = await fetchInviteeBySlug(slug);
        if (data) {
          setInvitee(data);
        } else {
          // Generate a formatted fallback name from slug
          const derivedName = slug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          setInvitee({
            id: 'temp',
            name: derivedName,
            slug,
            rsvp: 'pending',
            guest_count: 0,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
    loadGuest();
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

  const guestDisplayName = invitee?.name || 'Honored Guest';

  // Per-guest page title / social preview metadata
  useEffect(() => {
    const title = `Invitation for ${guestDisplayName} — Safiyya & Sharrafuth`;
    const description = `${guestDisplayName}, you are cordially invited to the wedding ceremony of Safiyya & Sharrafuth on Saturday, 12th December 2026 at Glen Reception Hall.`;

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
  }, [guestDisplayName]);

  return (
    <div className="relative min-h-screen w-full bg-[#fffafc] overflow-x-hidden text-[#4a3038]">
      {/* Ambient Watercolor Background blobs */}
      <WatercolorBackground />

      {/* Ambient Drifting Rose Petals */}
      <AmbientPetals />

      {/* Opening Portal Experience (pre-mounted for instantaneous 0ms display) */}
      {loadingStep !== 'invitation' && (
        <OpeningExperience
          key="opening"
          guestName={guestDisplayName}
          onDoorsOpening={() => setMusicStarted(true)}
          onEnterStart={() => {
            setIsScrollUnlocked(true);
          }}
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

      {/* Main Post-Opening Invitation Suite — Pre-mounted to guarantee 60fps instant transitions */}
      {loadingStep !== 'loader' && (
        <div className="w-full">
          <InvitationSuite invitee={invitee} onRsvpSuccess={handleRsvpSuccess} />
        </div>
      )}

      {/* Background music with corner toggle, begins as the doors open */}
      <BackgroundMusic active={musicStarted} />
    </div>
  );
};
