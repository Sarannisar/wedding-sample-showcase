import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FloralLoaderProps {
  onComplete?: () => void;
  guestName?: string;
}

const IMAGE_ASSETS = [
  '/assets/logo_saad_sheen_crest.png',
  '/assets/fancy_door_left.webp',
  '/assets/fancy_door_right.webp',
  '/assets/fancy_garden_palace.webp',
  '/assets/door_handle_crest_left.webp',
  '/assets/door_handle_crest_right.webp',
  '/assets/invite_card_bg_poster.webp',
];

const VIDEO_ASSET = '/assets/video_2026-08-31_13-56-43.mp4';
const AUDIO_ASSET = '/assets/BG_AUDIO.mp3';

export const FloralLoader: React.FC<FloralLoaderProps> = ({ onComplete, guestName }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let active = true;
    const startTime = Date.now();
    const MIN_LOAD_TIME = 900; // Snappy 0.9s fast intro

    // Smooth visual progress ticker
    const progressInterval = setInterval(() => {
      if (!active) return;
      const elapsed = Date.now() - startTime;
      const pct = Math.min(95, Math.round((elapsed / MIN_LOAD_TIME) * 90));
      setProgress(pct);
    }, 40);

    const preloadImages = IMAGE_ASSETS.map((src) => {
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

    const preloadVideo = new Promise<void>((resolve) => {
      try {
        const vid = document.createElement('video');
        vid.preload = 'auto';
        vid.muted = true;
        vid.playsInline = true;
        vid.src = VIDEO_ASSET;

        const onReady = () => {
          vid.removeEventListener('canplay', onReady);
          vid.removeEventListener('canplaythrough', onReady);
          resolve();
        };

        vid.addEventListener('canplay', onReady, { once: true });
        vid.addEventListener('canplaythrough', onReady, { once: true });
        vid.addEventListener('error', () => resolve(), { once: true });
        vid.load();

        setTimeout(resolve, 1000);
      } catch {
        resolve();
      }
    });

    const preloadAudio = new Promise<void>((resolve) => {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = AUDIO_ASSET;
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => resolve();
        setTimeout(resolve, 1000);
      } catch {
        resolve();
      }
    });

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, MIN_LOAD_TIME));

    Promise.all([...preloadImages, preloadVideo, preloadAudio, minDelay]).then(() => {
      if (!active) return;
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        if (active) {
          onComplete?.();
        }
      }, 100);
    });

    // Safety timeout (max 1.5s)
    const safetyTimer = setTimeout(() => {
      if (active) {
        clearInterval(progressInterval);
        setProgress(100);
        onComplete?.();
      }
    }, 1500);

    return () => {
      active = false;
      clearInterval(progressInterval);
      clearTimeout(safetyTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fffafc] px-4 select-none overflow-hidden"
    >
      {/* Ambient Watercolor Radial Background Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,235,242,0.8)_0%,rgba(255,250,252,1)_70%)]" />

      {/* Decorative Floating Bokeh Orbs */}
      <div className="absolute w-72 h-72 rounded-full bg-[#fdeef3]/60 blur-3xl -top-12 -left-12 pointer-events-none motion-safe:animate-pulse" />
      <div className="absolute w-72 h-72 rounded-full bg-[#fdeef3]/60 blur-3xl -bottom-12 -right-12 pointer-events-none motion-safe:animate-pulse" />

      <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
        {/* Animated Royal S&S Crest Logo with Aura Glow */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-[#e08aa3]/20 blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.82, filter: 'blur(10px)' }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: 'blur(0px)',
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center"
          >
            <img
              src="/assets/logo_saad_sheen_crest.png"
              alt="Safiyya & Sharrafuth Logo"
              className="w-full h-full object-contain filter drop-shadow-lg"
            />
          </motion.div>
        </div>

        {/* Couple Monogram Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="space-y-1"
        >
          <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e08aa3] font-bold block">
            Wedding Celebration
          </span>
          <h2 className="font-display text-2xl sm:text-3xl text-[#4a3038] font-medium tracking-wide">
            Safiyya & Sharrafuth
          </h2>
          {guestName && (
            <p className="font-body italic text-xs text-[#b05570] pt-0.5">
              Welcoming {guestName}
            </p>
          )}
        </motion.div>

        {/* Elegant Slender Rose-Gold Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 w-36 flex flex-col items-center gap-2"
        >
          <div className="w-full h-1 bg-[#f7cdd7]/40 rounded-full overflow-hidden p-0.5 border border-[#f2b8c6]/30">
            <motion.div
              className="h-full bg-gradient-to-r from-[#f7cdd7] via-[#e08aa3] to-[#b05570] rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
