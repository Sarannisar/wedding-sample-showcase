import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import { downloadCalendarIcs } from '@/lib/calendar';
import { useReveal } from '@/lib/useReveal';
import { Navigation, Calendar } from 'lucide-react';

import { logInviteeEvent } from '@/lib/supabase';

interface EventCardSectionProps {
  inviteeId?: string;
}

export const EventCardSection: React.FC<EventCardSectionProps> = ({ inviteeId }) => {
  const event = weddingConfig.event;
  const revealProps = useReveal();

  const handleOpenMaps = () => {
    if (inviteeId) {
      void logInviteeEvent(inviteeId, 'maps_opened');
    }
    window.open(event.venue.mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.section
      {...revealProps}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-5 sm:px-9">
        {/* Venue Subtitle */}
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold block mb-2">
          VENUE
        </span>

        {/* Venue Title */}
        <h2 className="font-serif text-2xl sm:text-3xl text-[#4a3038] font-medium tracking-wide">
          {event.venue.name}
        </h2>

        {/* Golden Diamond Divider */}
        <div className="flex items-center justify-center gap-3 my-4">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#f2b8c6]/50" />
          <span className="text-[#f2b8c6] text-xs">✦</span>
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#f2b8c6]/50" />
        </div>

        {/* Embedded Interactive Google Map Card */}
        <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-[#f2b8c6]/30 shadow-inner bg-[#fdeef3] my-4">
          {/* Interactive Google Map iframe */}
          <iframe
            title="Glen Reception Hall Map"
            src="https://maps.google.com/maps?q=Glen+Reception+Hall+325+Attidiya+Rd+Dehiwala-Mount+Lavinia&t=&z=15&ie=UTF8&iwloc=&output=embed"
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
          />

          {/* Top-Left Floating Info Callout Card */}
          <div className="absolute top-3 left-3 max-w-[210px] p-2.5 rounded-lg bg-white/95 backdrop-blur-xs border border-neutral-200 shadow-md text-left pointer-events-none z-10">
            <div className="flex items-start justify-between gap-1">
              <div>
                <h4 className="font-serif text-xs font-bold text-neutral-900 leading-tight">
                  {event.venue.name}
                </h4>
                <p className="text-[10px] text-neutral-600 truncate mt-0.5 max-w-[145px]">
                  {event.venue.address}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold mt-0.5">
                  <span>★ 4.2</span>
                  <span className="text-neutral-400 font-normal">(120+)</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 text-blue-600">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                  <Navigation className="w-3 h-3 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={downloadCalendarIcs}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-theme-primary/30 bg-theme-bg text-theme-muted hover:bg-theme-secondary-light hover:text-theme-primary-dark text-xs font-label uppercase tracking-widest font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Add to Calendar</span>
          </button>
          <button
            onClick={handleOpenMaps}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-theme-primary/30 bg-theme-bg text-theme-muted hover:bg-theme-secondary-light hover:text-theme-primary-dark text-xs font-label uppercase tracking-widest font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open in Maps →</span>
          </button>
        </div>
      </Card3D>
    </motion.section>
  );
};
