import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/**
 * Gently nudges the guest to keep scrolling until they reach the bottom
 * of the invitation. Reappears from time to time while there is more to see.
 */
export const ScrollGuide: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const check = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 140;
      setAtBottom(nearBottom);
      if (nearBottom) setVisible(false);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  useEffect(() => {
    if (atBottom) return;
    let hideTimer: ReturnType<typeof setTimeout>;
    const show = () => {
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 4200);
    };
    const first = setTimeout(show, 5000);
    const interval = setInterval(show, 8000);
    return () => {
      clearTimeout(first);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, [atBottom]);

  const scrollOn = () => {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && !atBottom && (
        <motion.button
          onClick={scrollOn}
          aria-label="Scroll down for more"
          initial={{ opacity: 0, x: 24, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.9 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 py-3.5 px-2 rounded-full bg-white/92 backdrop-blur-md border border-[#f2b8c6]/60 shadow-xl text-[#b05570] cursor-pointer group active:scale-95 transition-all select-none"
        >
          <span className="font-label text-[9px] uppercase tracking-[0.28em] font-bold [writing-mode:vertical-rl] text-[#b05570] group-hover:text-[#8a334d] transition-colors py-0.5">
            Scroll
          </span>
          <div className="w-[1.5px] h-3.5 bg-gradient-to-b from-[#f2b8c6] to-[#e08aa3] rounded-full" />
          <ChevronDown className="w-3.5 h-3.5 text-[#e08aa3] animate-bounce" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
