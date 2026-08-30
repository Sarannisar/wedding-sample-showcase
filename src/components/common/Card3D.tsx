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
  onClick?: () => void;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  enableTilt = true,
  withCorners = true,
  withShimmer = true,
  bgVideoSrc,
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
    if (bgVideoSrc && videoRef.current) {
      const vid = videoRef.current;
      vid.defaultMuted = true;
      vid.muted = true;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy blocks autoplay on mount, try again on user interaction
          const onFirstInteraction = () => {
            vid.play().catch(() => {});
            window.removeEventListener('touchstart', onFirstInteraction);
            window.removeEventListener('click', onFirstInteraction);
            window.removeEventListener('scroll', onFirstInteraction);
          };
          window.addEventListener('touchstart', onFirstInteraction, { passive: true, once: true });
          window.addEventListener('click', onFirstInteraction, { passive: true, once: true });
          window.addEventListener('scroll', onFirstInteraction, { passive: true, once: true });
        });
      }
    }
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
        {/* Background Video Layer */}
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
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
              onLoadedData={(e) => e.currentTarget.play().catch(() => {})}
              className="w-full h-full object-cover object-center opacity-45 filter brightness-105 contrast-95"
            />
            {/* Luminous frosted glass overlay for crystal clear letter contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/65 to-white/85 pointer-events-none" />
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
