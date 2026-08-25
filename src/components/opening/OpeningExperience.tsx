import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import { ArchitecturalPortal } from './ArchitecturalPortal';
import { MonogramReveal } from './MonogramReveal';
import { FloralForeground } from './FloralForeground';

interface OpeningExperienceProps {
  onOpenComplete: () => void;
  guestName?: string;
}

export const OpeningExperience: React.FC<OpeningExperienceProps> = ({
  onOpenComplete,
  guestName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  const [doorProgress, setDoorProgress] = useState(0);
  const [monogramOpacity, setMonogramOpacity] = useState(0);
  const [monogramScale, setMonogramScale] = useState(0.85);
  const [isStarted, setIsStarted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Mouse parallax state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setTilt({ x: x * 5, y: y * -5 });
  };

  const startCinematicSequence = () => {
    if (isStarted) return;
    setIsStarted(true);

    const tl = gsap.timeline({
      onComplete: () => {
        setIsRevealed(true);
      },
    });

    const animState = {
      doors: 0,
      monoOpacity: 0,
      monoScale: 0.85,
    };

    // Stage 1: Doors slide open sideways with smooth luxury acceleration/deceleration
    tl.to(animState, {
      doors: 1,
      duration: 2.8,
      ease: 'power3.inOut',
      onUpdate: () => {
        setDoorProgress(animState.doors);
      },
    })
      // Stage 2: Camera pushes gently forward
      .to(
        sceneRef.current,
        {
          scale: 1.12,
          duration: 3,
          ease: 'power2.out',
        },
        '-=2.4'
      )
      // Stage 3: Monogram, names & date illuminate smoothly
      .to(
        animState,
        {
          monoOpacity: 1,
          monoScale: 1,
          duration: 2,
          ease: 'power2.out',
          onUpdate: () => {
            setMonogramOpacity(animState.monoOpacity);
            setMonogramScale(animState.monoScale);
          },
        },
        '-=1.8'
      );
  };

  const handleEnterInvitation = () => {
    // Buttery-smooth cross-fade transition into the main invitation details
    gsap.to(containerRef.current, {
      opacity: 0,
      y: -40,
      scale: 1.03,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: onOpenComplete,
    });
  };

  // Allow scrolling to smoothly transition into the rest of the invite once opened
  useEffect(() => {
    if (!isRevealed) return;

    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 15) {
        handleEnterInvitation();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchEndY = e.touches[0].clientY;
      if (touchStartY - touchEndY > 25) {
        handleEnterInvitation();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isRevealed]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={() => {
        if (!isStarted) startCinematicSequence();
      }}
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#fff5f7] via-[#fdf0f3] to-[#fdf9f5] select-none ${
        !isStarted ? 'cursor-pointer' : ''
      }`}
    >
      {/* Soft Romantic Ambient Light Blooms */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full bg-[#e8a4b4]/25 blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#fcd5ce]/30 blur-[80px]" />
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#f8bbd0]/25 blur-[80px]" />
      </div>

      {/* 3D Scene Root - Full Screen on Mobile */}
      <div
        ref={sceneRef}
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        }}
        className="relative w-full h-full flex flex-col items-center justify-center transition-transform duration-300 ease-out"
      >
        {/* Full-bleed Sliding Doors */}
        <ArchitecturalPortal
          doorProgress={doorProgress}
          onClickDoor={!isStarted ? startCinematicSequence : undefined}
          isStarted={isStarted}
        />

        {/* Monogram, Couple Names, Date Reveal */}
        <MonogramReveal opacity={monogramOpacity} scale={monogramScale} />

        {/* Foreground Glow */}
        <FloralForeground progress={doorProgress} />
      </div>

      {/* Floating Action Controls */}
      <div className="absolute bottom-8 z-50 flex flex-col items-center gap-2 px-4">
        {!isStarted ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col items-center gap-2"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                startCinematicSequence();
              }}
              className="group relative px-8 py-3.5 rounded-full bg-white/95 backdrop-blur-md border border-[#b05570]/35 shadow-2xl hover:shadow-3xl active:scale-95 transition-all duration-300 flex items-center gap-3 cursor-pointer"
            >
              <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#e8a4b4] to-[#b05570] opacity-30 group-hover:opacity-60 blur-xs transition-opacity" />

              <span className="relative font-label text-xs sm:text-sm uppercase tracking-[0.25em] text-[#b05570] font-semibold">
                Tap Anywhere to Open
              </span>
              <span className="relative text-sm text-[#b05570] group-hover:translate-x-1 transition-transform">
                ✦
              </span>
            </button>

            {guestName && (
              <span className="font-body text-xs text-[#7d334a] font-medium italic drop-shadow-sm bg-white/80 backdrop-blur-xs px-3 py-0.5 rounded-full">
                Warmly welcoming {guestName}
              </span>
            )}
          </motion.div>
        ) : isRevealed ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center gap-2"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEnterInvitation();
              }}
              className="group px-8 py-3.5 rounded-full bg-gradient-to-r from-[#b05570] to-[#7d334a] text-white shadow-2xl hover:shadow-3xl active:scale-95 transition-all duration-300 flex items-center gap-3 cursor-pointer"
            >
              <span className="font-label text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-white">
                Scroll to Explore Invitation
              </span>
              <span className="text-white group-hover:translate-y-0.5 transition-transform">
                ↓
              </span>
            </button>
            <span className="font-label text-[11px] uppercase tracking-widest text-[#7d334a] font-bold animate-bounce bg-white/70 px-3 py-0.5 rounded-full shadow-xs">
              ↓ Scroll Down ↓
            </span>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
