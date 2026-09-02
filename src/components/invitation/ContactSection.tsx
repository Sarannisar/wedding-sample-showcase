import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import { useReveal } from '@/lib/useReveal';
import { Navigation, Phone } from 'lucide-react';

const CONTACTS = [
  { name: 'Illyas', phone: '0772257533' },
  { name: 'Samiha', phone: '0767962881' },
];

export const ContactSection: React.FC = () => {
  const event = weddingConfig.event;
  const revealProps = useReveal();

  return (
    <motion.section
      {...revealProps}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="py-8 px-5 sm:px-9">
        <div className="text-center">
          <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold block mb-2">
            Directions &amp; Contact
          </span>
          <h2 className="font-serif text-xl sm:text-2xl text-[#4a3038] font-medium tracking-wide">
            We're Here to Help
          </h2>
          <div className="flex items-center justify-center gap-3 my-4">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#f2b8c6]/50" />
            <span className="text-[#f2b8c6] text-xs">✦</span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#f2b8c6]/50" />
          </div>
        </div>

        {/* Contact rows */}
        <div className="space-y-2.5">
          {CONTACTS.map((c) => (
            <a
              key={c.phone}
              href={`tel:${c.phone}`}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#f2b8c6]/40 bg-[#fff6f9] hover:bg-[#f2b8c6]/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white border border-[#f2b8c6]/50 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-[#e08aa3]" />
                </span>
                <div className="text-left">
                  <p className="font-display text-sm font-semibold text-[#4a3038] leading-tight">
                    {c.name}
                  </p>
                  <p className="font-body text-xs text-[#b592a0]">Family Contact</p>
                </div>
              </div>
              <span className="font-label text-xs sm:text-sm tracking-wider text-[#b05570] font-semibold tabular-nums">
                {c.phone}
              </span>
            </a>
          ))}
        </div>


        <button
          onClick={() => window.open(event.venue.mapsUrl, '_blank', 'noopener,noreferrer')}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#f2b8c6] bg-[#fff6f9] text-[#a8808e] hover:bg-[#f2b8c6]/15 text-xs font-label uppercase tracking-widest font-semibold transition-all cursor-pointer active:scale-98"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Get Directions</span>
        </button>
      </Card3D>
    </motion.section>
  );
};
