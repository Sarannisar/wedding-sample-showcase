import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface FloralLoaderProps {
  onComplete?: () => void;
  guestName?: string;
}

const CRITICAL_ASSETS = [
  '/assets/fancy_door_left.jpg',
  '/assets/fancy_door_right.jpg',
  '/assets/fancy_garden_palace.jpg',
  '/assets/door_handle_crest_left.png',
  '/assets/door_handle_crest_right.png',
  '/assets/logo_saad_sheen_crest.png',
];

export const FloralLoader: React.FC<FloralLoaderProps> = ({ onComplete }) => {
  const isAnimationDoneRef = useRef(false);
  const isPreloadDoneRef = useRef(false);
  const isCompletedRef = useRef(false);

  const checkDone = () => {
    if (isAnimationDoneRef.current && isPreloadDoneRef.current && !isCompletedRef.current) {
      isCompletedRef.current = true;
      onComplete?.();
    }
  };

  useEffect(() => {
    let active = true;

    const preloadAll = async () => {
      const promises = CRITICAL_ASSETS.map((src) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            if (img.decode) {
              img.decode().then(resolve).catch(resolve);
            } else {
              resolve();
            }
          };
          img.onerror = () => resolve();
        });
      });

      await Promise.all(promises);
      if (active) {
        isPreloadDoneRef.current = true;
        checkDone();
      }
    };

    preloadAll();

    // Fallback safety timeout so loader never hangs
    const timer = setTimeout(() => {
      if (active && !isCompletedRef.current) {
        isPreloadDoneRef.current = true;
        isAnimationDoneRef.current = true;
        checkDone();
      }
    }, 3200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fffafc] px-4 select-none"
    >
      <div className="relative flex flex-col items-center max-w-sm text-center">
        {/* Animated S&S Monogram Logo */}
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
          {/* Logo Reveal — Smooth Fade, Scale & Soft Appearance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.86, filter: 'blur(6px)' }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              isAnimationDoneRef.current = true;
              checkDone();
            }}
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

