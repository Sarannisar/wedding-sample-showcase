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

export const GuestInvitePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [loadingStep, setLoadingStep] = useState<'loader' | 'opening' | 'invitation'>('loader');

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

  return (
    <div className="relative min-h-screen w-full bg-[#fdf9f5] overflow-x-hidden text-[#2d1a22]">
      {/* Ambient Watercolor Background blobs */}
      <WatercolorBackground />

      {/* Ambient Drifting Rose Petals */}
      <AmbientPetals />

      <AnimatePresence mode="wait">
        {loadingStep === 'loader' && (
          <FloralLoader
            key="loader"
            guestName={guestDisplayName}
            onComplete={() => setLoadingStep('opening')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {loadingStep === 'opening' && (
          <OpeningExperience
            key="opening"
            guestName={guestDisplayName}
            onOpenComplete={() => {
              setLoadingStep('invitation');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Post-Opening Invitation Suite (Reference 02 Post-Opening) */}
      {loadingStep === 'invitation' && (
        <InvitationSuite invitee={invitee} onRsvpSuccess={handleRsvpSuccess} />
      )}
    </div>
  );
};
