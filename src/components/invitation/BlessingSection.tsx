import React from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';

export const BlessingSection: React.FC = () => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-6 sm:px-10">
        {/* Subtle Decorative Arch Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#e08aa3]" />
          <span className="text-[#b05570] text-xs">✦</span>
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#e08aa3]" />
        </div>

        {/* Surah Ar-Rum Arabic Calligraphy */}
        <div className="mb-4 px-2">
          <p className="font-arabic text-base sm:text-lg lg:text-xl text-[#8a243e] font-normal leading-[2.1] sm:leading-[2.3] tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            وَمِنْ ءَايَـٰتِهِۦٓ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَٰجًۭا لِّتَسْكُنُوٓا۟ إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةًۭ وَرَحْمَةً ۚ إِنَّ فِى ذَٰلِكَ لَـَٔايَـٰتٍۢ لِّقَوْمٍۢ يَتَفَكَّرُونَ ٢١
          </p>
        </div>

        {/* English Translation */}
        <p className="font-serif italic text-xs sm:text-sm text-[#704655] leading-relaxed max-w-md mx-auto my-3 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
          "And among His signs is that He created for you spouses from among yourselves, that you may find tranquility in them, and He placed between you affection and mercy."
        </p>

        {/* Citation Badge */}
        <div className="mt-3">
          <span className="font-label text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-[#b05570] font-semibold drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            Surah Ar-Rum (30:21)
          </span>
        </div>

        {/* Subtle Decorative Bottom Divider */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#e08aa3]" />
          <span className="text-[#b05570] text-xs">✦</span>
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#e08aa3]" />
        </div>
      </Card3D>
    </motion.section>
  );
};
