import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import { Navigation } from 'lucide-react';

export const EventCardSection: React.FC = () => {
  const event = weddingConfig.event;

  const handleOpenMaps = () => {
    window.open(event.venue.mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-5 sm:px-9">
        {/* Venue Subtitle */}
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#a07855] font-semibold block mb-2">
          VENUE
        </span>

        {/* Venue Title */}
        <h3 className="font-serif text-2xl sm:text-3xl text-[#2d1a22] font-medium tracking-wide">
          {event.venue.name}
        </h3>

        {/* Golden Diamond Divider */}
        <div className="flex items-center justify-center gap-3 my-4">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#c59b6d]/50" />
          <span className="text-[#c59b6d] text-xs">✦</span>
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#c59b6d]/50" />
        </div>

        {/* Embedded Interactive Google Map Card */}
        <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-[#c59b6d]/30 shadow-inner bg-[#f4ece1] my-4">
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

        {/* Clean Open in Maps Button */}
        <div className="mt-4">
          <button
            onClick={handleOpenMaps}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg border border-[#c59b6d] bg-[#fbf8f2] text-[#8c6d58] hover:bg-[#c59b6d]/15 text-xs font-label uppercase tracking-widest font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span>Open in Maps →</span>
          </button>
        </div>
      </Card3D>
    </motion.section>
  );
};
