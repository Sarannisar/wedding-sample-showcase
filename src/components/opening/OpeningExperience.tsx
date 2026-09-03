import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import { ArchitecturalPortal, ArchitecturalPortalHandle } from './ArchitecturalPortal';
import { MonogramReveal } from './MonogramReveal';

interface OpeningExperienceProps {
  onOpenComplete: () => void;
  onDoorsOpening?: () => void;
  onEnterStart?: () => void;
  guestName?: string;
}

export const OpeningExperience: React.FC<OpeningExperienceProps> = ({
  onOpenComplete,
  onDoorsOpening,
  onEnterStart,
  guestName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<ArchitecturalPortalHandle>(null);
  const isTransitioningRef = useRef(false);
  const rafId = useRef<number | null>(null);

  const [isStarted, setIsStarted] = useState(false);
  const [isCardVisible, setIsCardVisible] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !sceneRef.current || isTransitioningRef.current) return;
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = ((clientX - left) / width - 0.5) * 4;
    const y = ((clientY - top) / height - 0.5) * -4;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (sceneRef.current) {
        sceneRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
      }
    });
  };

  const startCinematicSequence = () => {
    if (isStarted || isTransitioningRef.current) return;
    setIsStarted(true);

    const leftDoor = portalRef.current?.leftDoor;
    const rightDoor = portalRef.current?.rightDoor;

    onDoorsOpening?.();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (leftDoor && rightDoor) {
        gsap.set([leftDoor, rightDoor], { xPercent: (i) => (i === 0 ? -102 : 102) });
      }
      setIsCardVisible(true);
      return;
    }

    const tl = gsap.timeline();

    if (leftDoor && rightDoor) {
      // Direct GPU hardware-accelerated door slide (0 React re-renders, locked 60/120fps)
      tl.to([leftDoor, rightDoor], {
        xPercent: (i) => (i === 0 ? -102 : 102),
        duration: 2.2,
        ease: 'power2.inOut',
        force3D: true,
      });
    }

    // Gentle camera push into fairytale scene
    tl.to(
      sceneRef.current,
      {
        scale: 1.05,
        duration: 2.4,
        ease: 'power2.out',
        force3D: true,
      },
      0.1
    )
      // Reveal monogram popup card smoothly
      .call(() => {
        setIsCardVisible(true);
      }, undefined, '-=1.2')
      .to({}, { duration: 1.6 });
  };

  const handleEnterInvitation = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    onEnterStart?.();

    if (!containerRef.current) {
      onOpenComplete();
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onOpenComplete();
      return;
    }

    containerRef.current.style.pointerEvents = 'none';

    // Luxurious smooth glide-up and cross-fade into the main invitation suite
    gsap.to(containerRef.current, {
      opacity: 0,
      y: -50,
      scale: 0.98,
      duration: 0.65,
      ease: 'power2.inOut',
      onComplete: () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        onOpenComplete();
      },
    });
  };

  // Allow scrolling/swiping to smoothly transition into the rest of the invite immediately once popup appears
  useEffect(() => {
    if (!isCardVisible) return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 5 || isTransitioningRef.current) {
        if (e.cancelable) e.preventDefault();
        handleEnterInvitation();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touchEndY = e.touches[0].clientY;
        if (touchStartY - touchEndY > 8 || isTransitioningRef.current) {
          if (e.cancelable) e.preventDefault();
          handleEnterInvitation();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isCardVisible]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={() => {
        if (!isStarted) startCinematicSequence();
      }}
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#fff5f9] select-none ${
        !isStarted ? 'cursor-pointer' : ''
      }`}
    >
      {/* 3D Scene Root - Full Screen on Mobile */}
      <div
        ref={sceneRef}
        style={{ willChange: 'transform' }}
        className="relative w-full h-full flex flex-col items-center justify-center transition-transform duration-150 ease-out transform-gpu"
      >
        {/* Full-bleed Sliding Doors */}
        <ArchitecturalPortal
          ref={portalRef}
          onClickDoor={!isStarted ? startCinematicSequence : undefined}
          isStarted={isStarted}
        />

        {/* Monogram, Couple Names, Date Reveal */}
        <MonogramReveal visible={isCardVisible} />
      </div>

      {/* Floating Action Controls */}
      <div className="absolute bottom-8 z-50 flex flex-col items-center gap-2 px-4 pointer-events-auto">
        {!isStarted ? (
          <motion.div
            key="tap-to-open"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="flex flex-col items-center gap-2"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                startCinematicSequence();
              }}
              className="group relative px-8 py-3.5 rounded-full bg-white/95 backdrop-blur-md border border-[#e08aa3]/35 shadow-2xl hover:shadow-3xl active:scale-95 transition-all duration-300 flex items-center gap-3 cursor-pointer"
            >
              <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#f7c1d0] to-[#e08aa3] opacity-30 group-hover:opacity-60 blur-xs transition-opacity" />

              <span className="relative font-label text-xs sm:text-sm uppercase tracking-[0.25em] text-[#e08aa3] font-semibold">
                Tap Anywhere to Open
              </span>
              <span className="relative text-sm text-[#e08aa3] group-hover:translate-x-1 transition-transform">
                ✦
              </span>
            </button>

            {guestName && (
              <span className="font-body text-xs text-[#b05570] font-medium italic drop-shadow-sm bg-white/80 backdrop-blur-xs px-3 py-0.5 rounded-full">
                Warmly welcoming {guestName}
              </span>
            )}
          </motion.div>
        ) : isCardVisible ? (
          <motion.div
            key="scroll-to-explore"
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-2"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEnterInvitation();
              }}
              className="group px-8 py-3.5 rounded-full bg-gradient-to-r from-[#e08aa3] to-[#b05570] text-white shadow-2xl hover:shadow-3xl active:scale-95 transition-all duration-300 flex items-center gap-3 cursor-pointer"
            >
              <span className="font-label text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-white">
                Scroll to Explore Invitation
              </span>
              <span className="text-white group-hover:translate-y-0.5 transition-transform">
                ↓
              </span>
            </button>
            <span className="font-label text-[11px] uppercase tracking-widest text-[#b05570] font-bold motion-safe:animate-bounce bg-white/70 px-3 py-0.5 rounded-full shadow-xs">
              ↓ Scroll Down ↓
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
