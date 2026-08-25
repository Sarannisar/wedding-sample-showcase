import React from 'react';
import { weddingConfig } from '@/config/weddingConfig';

interface MonogramRevealProps {
  opacity: number;
  scale: number;
}

export const MonogramReveal: React.FC<MonogramRevealProps> = ({ opacity, scale }) => {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 transition-all duration-300 px-4"
      style={{
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div className="flex flex-col items-center text-center max-w-xs -mt-10 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-[#e08aa3]/20 shadow-2xl">
        {/* Simpler, Modern Luxury S&S Monogram Emblem */}
        <div className="relative mb-3 flex items-center justify-center">
          {/* Luminous Warm Glow */}
          <div className="absolute inset-0 w-28 h-28 rounded-full bg-[#fbd0de]/40 blur-xl animate-pulse-slow pointer-events-none" />

          {/* Clean Circular S&S Logo */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden drop-shadow-lg border border-[#f2b8c6]/30 bg-white">
            <img
              src="/assets/logo_saad_sheen_crest.jpg"
              alt="S & S Wedding Monogram"
              className="w-full h-full object-cover scale-105"
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
      </div>
    </div>
  );
};
