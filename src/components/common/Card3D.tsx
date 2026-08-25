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
  onClick?: () => void;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  enableTilt = true,
  withCorners = true,
  withShimmer = true,
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
          'relative rounded-2xl bg-[#fdfcf9]/95 backdrop-blur-md p-6 sm:p-8',
          'border border-[#c59b6d]/40 shadow-xl hover:shadow-2xl',
          'transition-shadow duration-500 paper-texture preserve-3d',
          onClick && 'cursor-pointer active:scale-[0.99]',
          className
        )}
      >
        {/* Subtle Inset Double Line Border */}
        <div className="absolute inset-2.5 rounded-xl border border-[#c59b6d]/20 pointer-events-none" />

        {/* 4 Corner Double-Gold Brackets */}
        {withCorners && <CornerBrackets color="#c59b6d" size={20} weight={1.2} offset={8} />}

        {/* Shimmer Sweep */}
        {withShimmer && <ShimmerSweep />}

        {/* Card Content Layer */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
};
