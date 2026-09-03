import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CornerBrackets } from './CornerBrackets';
import { ShimmerSweep } from './ShimmerSweep';
import { cn } from '@/lib/utils';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  enableTilt?: boolean;
  withCorners?: boolean;
  withShimmer?: boolean;
  bgVideoSrc?: string;
  bgVideoClassName?: string;
  onClick?: () => void;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  enableTilt = true,
  withCorners = true,
  withShimmer = true,
  bgVideoSrc,
  bgVideoClassName,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse / Touch tilt springs
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['5deg', '-5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-5deg', '5deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const videoRef = useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !bgVideoSrc) return;

    vid.defaultMuted = true;
    vid.muted = true;

    // Immediately trigger play
    vid.play().catch(() => {});

    // IntersectionObserver: Only play video when in viewport to eliminate mobile CPU/GPU contention
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      },
      { threshold: 0.05 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    // Low Power Mode / Battery Saver autoplay fallback trigger on first user interaction
    const onUserInteraction = () => {
      if (vid.paused && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          vid.play().catch(() => {});
        }
      }
    };

    window.addEventListener('pointerdown', onUserInteraction, { once: true, passive: true });
    window.addEventListener('click', onUserInteraction, { once: true, passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('click', onUserInteraction);
    };
  }, [bgVideoSrc]);

  return (
    <div className="perspective-1200 w-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX: enableTilt ? rotateX : 0,
          rotateY: enableTilt ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        className={cn(
          'relative rounded-2xl p-6 sm:p-8 overflow-hidden',
          bgVideoSrc ? 'bg-white/70 backdrop-blur-sm' : 'bg-[#fffdfe]/95 backdrop-blur-md paper-texture',
          'border border-[#f2b8c6]/40 shadow-xl hover:shadow-2xl',
          'transition-shadow duration-500 preserve-3d',
          onClick && 'cursor-pointer active:scale-[0.99]',
          className
        )}
      >
        {/* Background Hardware-Accelerated Video Layer */}
        {bgVideoSrc && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-2xl">
            <video
              ref={videoRef}
              src={bgVideoSrc}
              poster="/assets/invite_card_bg_poster.webp"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              disablePictureInPicture
              disableRemotePlayback
              className={cn(
                'w-full h-full object-cover object-bottom opacity-60 filter brightness-105 contrast-95 transform-gpu',
                bgVideoClassName
              )}
              style={{
                transform: 'translate3d(0, 0, 0)',
                backfaceVisibility: 'hidden',
              }}
            />
            {/* Luminous frosted glass overlay for crystal clear letter contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/50 to-white/80 pointer-events-none" />
          </div>
        )}

        {/* Subtle Inset Double Line Border */}
        <div className="absolute inset-2.5 rounded-xl border border-[#f2b8c6]/20 pointer-events-none z-10" />

        {/* 4 Corner Double-Gold Brackets */}
        {withCorners && <CornerBrackets color="#f2b8c6" size={20} weight={1.2} offset={8} />}

        {/* Shimmer Sweep */}
        {withShimmer && <ShimmerSweep />}

        {/* Card Content Layer */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
};
