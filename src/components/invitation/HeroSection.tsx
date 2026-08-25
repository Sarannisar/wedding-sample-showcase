import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';

interface HeroSectionProps {
  guestName?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ guestName }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-10 px-6 sm:px-10">
        {/* Bismillah Arabic Calligraphy */}
        <div className="mb-4">
          <p className="font-arabic text-3xl sm:text-4xl text-[#7d334a] font-normal tracking-wide leading-relaxed">
            {weddingConfig.cultural.bismillah.arabic}
          </p>
          <p className="font-serif italic text-xs sm:text-sm text-[#8c6d58] mt-1">
            "{weddingConfig.cultural.bismillah.translation}"
          </p>
        </div>

        {/* Small Header Badge */}
        <div className="my-3">
          <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#a07855] font-semibold">
            Wedding Ceremony
          </span>
        </div>

        {/* Personalized Guest Addressing */}
        <div className="my-2">
          <h3 className="font-serif italic text-2xl sm:text-3xl text-[#2d1a22] font-medium leading-snug">
            Dearest {guestName || 'Respected Guest and Family'},
          </h3>
        </div>

        {/* Subtle Gold Diamond Divider */}
        <div className="flex items-center justify-center gap-3 my-4">
          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-[#c59b6d]/50" />
          <span className="text-[#c59b6d] text-xs">✦</span>
          <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-[#c59b6d]/50" />
        </div>

        {/* Invitation Host Body Text */}
        <p className="font-serif text-xs sm:text-sm text-[#5c4a42] max-w-md mx-auto my-3 leading-relaxed">
          With great joy and blessings, the families of{' '}
          <span className="font-semibold text-[#2d1a22]">{weddingConfig.hosts.primary}</span>{' '}
          request the pleasure of your company at the wedding ceremony of their beloved daughter & son,
        </p>

        {/* Flowing Couple Names in Kaushan Script */}
        <div className="my-6 space-y-1">
          <h2 className="font-kaushan text-4xl sm:text-5xl lg:text-6xl text-[#9d6b47] font-normal tracking-wide drop-shadow-xs">
            {weddingConfig.couple.groom}
          </h2>

          <div className="py-1">
            <span className="font-serif italic text-lg sm:text-xl text-[#8c6d58] block font-normal">
              and
            </span>
          </div>

          <h2 className="font-kaushan text-4xl sm:text-5xl lg:text-6xl text-[#9d6b47] font-normal tracking-wide drop-shadow-xs">
            {weddingConfig.couple.bride}
          </h2>
        </div>

        {/* Bottom Gold Accent */}
        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#c59b6d]/50 to-transparent mx-auto mt-6" />
      </Card3D>
    </motion.section>
  );
};
