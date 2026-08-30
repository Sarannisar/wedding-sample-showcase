import React from 'react';
import { motion } from 'framer-motion';
import { weddingConfig } from '@/config/weddingConfig';

interface MonogramRevealProps {
  visible: boolean;
}

export const MonogramReveal: React.FC<MonogramRevealProps> = ({ visible }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 30 }}
        animate={
          visible
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.86, y: 30 }
        }
        transition={{
          duration: 4.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="flex flex-col items-center text-center max-w-xs -mt-10 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-[#e08aa3]/25 shadow-2xl"
      >
        {/* Luxury S&S Monogram Emblem */}
        <div className="relative mb-3 flex items-center justify-center">
          {/* Clean Circular S&S Logo */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden drop-shadow-md border border-[#f2b8c6]/40 bg-white flex items-center justify-center p-1">
            <img
              src="/assets/logo_saad_sheen_crest.png"
              alt="S & S Wedding Monogram"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Invitation Subtitle */}
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#b05570] font-bold mb-1">
          The Wedding Celebration of
        </span>

        {/* Couple Names in Kaushan Script */}
        <h1 className="font-kaushan text-2xl sm:text-3xl text-[#6b2436] font-normal leading-snug">
          {weddingConfig.couple.brideFullName || 'Safiyya Ilyas'}
          <span className="block font-serif italic text-base sm:text-lg text-[#a8808e] my-1.5 sm:my-2">
            and
          </span>
          {weddingConfig.couple.groomFullName || 'Sharrafuth Najiullah'}
        </h1>

        {/* Golden Divider */}
        <div className="w-20 h-[1.5px] bg-gradient-to-r from-transparent via-[#f2b8c6] to-transparent my-2" />

        {/* Wedding Date */}
        <p className="font-label text-xs uppercase tracking-[0.2em] text-[#b05570] font-bold">
          {weddingConfig.event.dayAndDate}
        </p>
      </motion.div>
    </div>
  );
};
