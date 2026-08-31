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
      <Card3D
        bgVideoSrc="/assets/video_2026-08-31_13-56-43.mp4"
        className="text-center py-10 px-6 sm:px-10"
      >
        {/* Bismillah Arabic Calligraphy */}
        <div className="mb-5">
          <p className="font-arabic text-xl sm:text-2xl text-[#8a243e] font-normal tracking-wide leading-[1.8] sm:leading-[1.9] pb-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            {weddingConfig.cultural.bismillah.arabic}
          </p>
          <p className="font-serif italic text-xs sm:text-sm text-[#704655] mt-2 leading-relaxed drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            "{weddingConfig.cultural.bismillah.translation}"
          </p>
        </div>

        {/* Dearest Salutation */}
        <div className="mt-4 mb-1">
          <p className="font-serif italic text-base sm:text-lg text-[#b04362] tracking-widest font-normal drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            Dearest
          </p>
        </div>

        {/* Personalized Guest Addressing */}
        <div className="mb-3">
          <h3 className="font-serif italic text-2xl sm:text-3xl text-[#5c1c2b] font-semibold leading-snug tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            {guestName || 'Mohammed & Family'},
          </h3>
        </div>

        {/* Subtle Gold Diamond Divider */}
        <div className="flex items-center justify-center gap-3 my-4">
          <div className="w-16 h-[1.5px] bg-gradient-to-r from-transparent to-[#e08aa3]" />
          <span className="text-[#b05570] text-xs">✦</span>
          <div className="w-16 h-[1.5px] bg-gradient-to-l from-transparent to-[#e08aa3]" />
        </div>

        {/* Invitation Host Body Text */}
        <p className="font-serif text-xs sm:text-sm text-[#4a2e38] max-w-md mx-auto my-3 leading-relaxed drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
          With great joy and blessings, the families of{' '}
          <span className="font-bold text-[#32131c]">{weddingConfig.hosts.primary}</span>{' '}
          request the pleasure of your company at the wedding ceremony of their beloved daughter
        </p>

        {/* Flowing Couple Names in Kaushan Script */}
        <div className="my-8 flex flex-col items-center">
          <h2 className="font-kaushan text-4xl sm:text-5xl lg:text-6xl text-[#b04362] font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] leading-none">
            {weddingConfig.couple.bride}
          </h2>

          <div className="mt-6 sm:mt-8 mb-3 sm:mb-4 flex items-center justify-center">
            <span className="font-serif italic text-xl sm:text-2xl text-[#825464] block font-normal tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              with
            </span>
          </div>

          <h2 className="font-kaushan text-4xl sm:text-5xl lg:text-6xl text-[#b04362] font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)] leading-none">
            {weddingConfig.couple.groom}
          </h2>

          <p className="font-serif italic text-xs sm:text-sm text-[#704655] mt-4 font-medium tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            Son of Mr. and Mrs. Najiullah
          </p>
        </div>

        {/* Bottom Gold Accent */}
        <div className="w-24 h-[1.5px] bg-gradient-to-r from-transparent via-[#e08aa3] to-transparent mx-auto mt-6" />
      </Card3D>
    </motion.section>
  );
};
