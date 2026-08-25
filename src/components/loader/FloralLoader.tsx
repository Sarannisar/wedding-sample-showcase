import React from 'react';
import { motion } from 'framer-motion';

interface FloralLoaderProps {
  onComplete?: () => void;
  guestName?: string;
}

export const FloralLoader: React.FC<FloralLoaderProps> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fdf9f5] px-4 select-none"
    >
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Animated Drawing of the S&S Monogram Logo */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center overflow-hidden">
          {/* Ambient Warm Golden Glow */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 m-auto w-40 h-40 rounded-full bg-[#f8bbd0]/30 blur-3xl pointer-events-none"
          />

          {/* Logo Drawing Reveal with Progressive Clip-Path */}
          <motion.div
            initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0, scale: 0.94 }}
            animate={{
              clipPath: 'inset(0% 0% 0% 0%)',
              opacity: [0, 0.5, 0.85, 1],
              scale: 1,
            }}
            transition={{ duration: 2.2, ease: [0.25, 1, 0.5, 1] }}
            onAnimationComplete={onComplete}
            className="relative w-full h-full flex items-center justify-center"
          >
            <img
              src="/assets/monogram_crest_simple.png"
              alt="S&S Logo Drawing"
              className="w-full h-full object-contain filter drop-shadow-sm scale-105"
            />
          </motion.div>

          {/* Traveling Drawing Light Tip */}
          <motion.div
            initial={{ top: '85%', left: '50%', opacity: 0 }}
            animate={{
              top: ['85%', '65%', '35%', '15%'],
              left: ['50%', '35%', '65%', '50%'],
              opacity: [0, 0.9, 1, 0],
            }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
            className="absolute w-4 h-4 rounded-full bg-[#c59b6d] blur-xs shadow-md pointer-events-none"
          />
        </div>
      </div>
    </motion.div>
  );
};
