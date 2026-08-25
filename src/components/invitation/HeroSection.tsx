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
        <div className="mb-6">
          <p className="font-arabic text-3xl sm:text-4xl text-[#b05570] font-normal tracking-wide leading-[1.8] sm:leading-[1.9] pb-1">
            {weddingConfig.cultural.bismillah.arabic}
          </p>
          <p className="font-serif italic text-xs sm:text-sm text-[#a8808e] mt-3 leading-relaxed">
            "{weddingConfig.cultural.bismillah.translation}"
          </p>
        </div>

        {/* Small Header Badge */}
        <div className="my-3">
          <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold">
            Wedding Ceremony
          </span>
        </div>

        {/* Personalized Guest Addressing */}
        <div className="my-2">
          <h3 className="font-serif italic text-2xl sm:text-3xl text-[#4a3038] font-medium leading-snug">
            Dearest {guestName || 'Respected Guest and Family'},
          </h3>
        </div>

        {/* Subtle Gold Diamond Divider */}
        <div className="flex items-center justify-center gap-3 my-4">
          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-[#f2b8c6]/50" />
          <span className="text-[#f2b8c6] text-xs">✦</span>
          <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-[#f2b8c6]/50" />
        </div>

        {/* Invitation Host Body Text */}
        <p className="font-serif text-xs sm:text-sm text-[#6f5860] max-w-md mx-auto my-3 leading-relaxed">
          With great joy and blessings, the families of{' '}
          <span className="font-semibold text-[#4a3038]">{weddingConfig.hosts.primary}</span>{' '}
          request the pleasure of your company at the wedding ceremony of their beloved daughter
        </p>

        {/* Flowing Couple Names in Kaushan Script */}
        <div className="my-8 flex flex-col items-center">
          <h2 className="font-kaushan text-4xl sm:text-5xl lg:text-6xl text-[#dd8ea5] font-normal tracking-wide drop-shadow-xs leading-none">
            {weddingConfig.couple.bride}
          </h2>

          <div className="mt-6 sm:mt-8 mb-3 sm:mb-4 flex items-center justify-center">
            <span className="font-serif italic text-xl sm:text-2xl text-[#a8808e] block font-normal tracking-wide">
              with
            </span>
          </div>

          <h2 className="font-kaushan text-4xl sm:text-5xl lg:text-6xl text-[#dd8ea5] font-normal tracking-wide drop-shadow-xs leading-none">
            {weddingConfig.couple.groom}
          </h2>

          <p className="font-serif italic text-xs sm:text-sm text-[#a8808e] mt-4 font-normal tracking-wide">
            Son of Mr. and Mrs. Najiullah
          </p>
        </div>

        {/* Bottom Gold Accent */}
        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#f2b8c6]/50 to-transparent mx-auto mt-6" />
      </Card3D>
    </motion.section>
  );
};
