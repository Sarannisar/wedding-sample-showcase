import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import { useReveal } from '@/lib/useReveal';

export const ClosingSection: React.FC = () => {
  const closing = weddingConfig.cultural.closing;
  const revealProps = useReveal();

  return (
    <motion.section
      {...revealProps}
      className="w-full max-w-xl mx-auto my-6 mb-16 px-3"
    >
      <Card3D className="text-center py-10 px-6 sm:px-10">
        {/* Subtle Decorative Floral Icon */}
        <div className="w-10 h-10 rounded-full bg-[#fff6f9] border border-[#f2b8c6]/40 mx-auto mb-4 flex items-center justify-center text-[#f2b8c6]">
          <span className="text-sm">❦</span>
        </div>

        {/* Closing Arabic Dua */}
        <p className="font-arabic text-2xl sm:text-3xl text-[#b05570] font-normal leading-relaxed mb-3 max-w-md mx-auto">
          {closing.arabicDua}
        </p>

        {/* English Translation */}
        <p className="font-serif italic text-xs sm:text-sm text-[#6f5860] leading-relaxed max-w-md mx-auto mb-6">
          "{closing.blessing}"
        </p>

        {/* Cultural Ameen Calligraphy & Word */}
        <div className="space-y-1">
          <p className="font-arabic text-2xl sm:text-3xl text-[#b05570]">
            {closing.ameenArabic}
          </p>
          <p className="font-serif text-xs tracking-widest text-[#7a4d5d] uppercase font-semibold">
            {closing.ameenWord}
          </p>
        </div>

        {/* Bottom Couple Monogram Stamp with Kaushan font */}
        <div className="mt-8 pt-6 border-t border-[#f2b8c6]/20 flex flex-col items-center justify-center">
          <span className="font-kaushan text-xl text-[#dd8ea5] tracking-wider">
            Safiyya & Sharrafuth
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.25em] text-[#7a4d5d] mt-1 font-medium">
            12th December 2026
          </span>
        </div>
      </Card3D>
    </motion.section>
  );
};
