import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAmbientActive } from '@/lib/useAmbientActive';

export const WatercolorBackground: React.FC = () => {
  const { isActive, prefersReducedMotion, isLowPowerDevice } = useAmbientActive();

  // On low power / mobile devices, render 4 blobs instead of 8 to reduce GPU memory & blur composition overhead
  const activeBlobs = useMemo(() => {
    const allBlobs = [
      { id: 1, color: '#f8d7da', size: 360, x: '10%', y: '5%', dur: 24 },
      { id: 2, color: '#fcdfd5', size: 420, x: '80%', y: '15%', dur: 32 },
      { id: 3, color: '#f5d0dc', size: 300, x: '30%', y: '40%', dur: 28 },
      { id: 4, color: '#fae1dd', size: 480, x: '75%', y: '60%', dur: 36 },
      { id: 5, color: '#fce4ec', size: 380, x: '15%', y: '75%', dur: 26 },
      { id: 6, color: '#fed7d7', size: 440, x: '60%', y: '85%', dur: 30 },
      { id: 7, color: '#f7d6e0', size: 320, x: '45%', y: '20%', dur: 34 },
      { id: 8, color: '#ffe5d9', size: 400, x: '90%', y: '45%', dur: 29 },
    ];
    return isLowPowerDevice ? allBlobs.slice(0, 4) : allBlobs;
  }, [isLowPowerDevice]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#fffafc]">
      {activeBlobs.map((blob) => (
        <motion.div
          key={blob.id}
          className="absolute rounded-full blur-3xl opacity-40 mix-blend-multiply filter"
          style={{
            backgroundColor: blob.color,
            width: blob.size,
            height: blob.size,
            left: blob.x,
            top: blob.y,
          }}
          animate={
            prefersReducedMotion
              ? { x: 0, y: 0, scale: 1 }
              : {
                  x: [0, 40, -30, 20, 0],
                  y: [0, -50, 30, -20, 0],
                  scale: [1, 1.15, 0.95, 1.08, 1],
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: !isActive ? 0 : blob.dur,
                  repeat: !isActive ? 0 : Infinity,
                  ease: 'easeInOut',
                }
          }
        />
      ))}
      {/* Light parchment noise overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-[#fffafc]/80 pointer-events-none" />
    </div>
  );
};
