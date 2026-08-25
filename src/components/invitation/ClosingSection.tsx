import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';

export const ClosingSection: React.FC = () => {
  const closing = weddingConfig.cultural.closing;

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
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
          <p className="font-serif text-xs tracking-widest text-[#a8808e] uppercase font-semibold">
            {closing.ameenWord}
          </p>
        </div>

        {/* Bottom Couple Monogram Stamp with Kaushan font */}
        <div className="mt-8 pt-6 border-t border-[#f2b8c6]/20 flex flex-col items-center justify-center">
          <span className="font-kaushan text-xl text-[#dd8ea5] tracking-wider">
            Safiyya & Sharrafuth
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.25em] text-[#a8808e] mt-1 font-medium">
            12th December 2026
          </span>
        </div>
      </Card3D>
    </motion.section>
  );
};
