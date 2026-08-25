import React from 'react';

interface ShimmerSweepProps {
  className?: string;
}

export const ShimmerSweep: React.FC<ShimmerSweepProps> = ({ className = '' }) => {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden z-10 ${className}`}>
      <div
        className="absolute top-0 -inset-full h-full w-[200%] opacity-20 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer"
        style={{
          transform: 'skewX(-25deg)',
        }}
      />
    </div>
  );
};
