import React from 'react';

interface FloralForegroundProps {
  progress: number;
}

export const FloralForeground: React.FC<FloralForegroundProps> = ({ progress }) => {
  const opacity = Math.max(0, 1 - progress * 1.5);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-visible transition-opacity duration-300"
      style={{ opacity }}
    >
      {/* Soft atmospheric glow around the door base */}
      <div className="absolute -bottom-4 inset-x-0 h-16 bg-gradient-to-t from-[#f7c1d0]/20 to-transparent pointer-events-none" />
    </div>
  );
};
