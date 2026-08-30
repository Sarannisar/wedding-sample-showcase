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
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fffafc] px-4 select-none"
    >
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Animated Drawing of the S&S Monogram Logo */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* Ambient Warm Golden Glow */}
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 m-auto w-44 h-44 rounded-full bg-[#fbd0de]/40 blur-3xl pointer-events-none"
          />

          {/* Logo Reveal — Smooth Fade, Scale & Soft Ambient Appearance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.86, filter: 'blur(6px)' }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={onComplete}
            className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center"
          >
            <img
              src="/assets/logo_saad_sheen_crest.png"
              alt="S&S Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
