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
    const interval = setInterval(show, 18000);
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#f2b8c6]/60 shadow-lg text-[#b05570] cursor-pointer"
        >
          <span className="font-label text-[10px] uppercase tracking-[0.25em] font-semibold">
            Scroll for more
          </span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
