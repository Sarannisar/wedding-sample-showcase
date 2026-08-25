import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Petal {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  rotateStart: number;
  rotateEnd: number;
  opacity: number;
  color: string;
}

export const AmbientPetals: React.FC = () => {
  // Exactly 28 floating rose petals as specified in the template
  const petals: Petal[] = useMemo(() => {
    const colors = ['#f4c2c2', '#f7c1d0', '#fcd5ce', '#fad2e1', '#fbd0de', '#ffccd5'];
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // percentage across screen width
      size: 14 + Math.random() * 16, // 14px to 30px
      duration: 14 + Math.random() * 16, // 14s to 30s slow fall
      delay: Math.random() * 15,
      rotateStart: Math.random() * 360,
      rotateEnd: Math.random() * 360 + 360,
      opacity: 0.35 + Math.random() * 0.45,
      color: colors[i % colors.length],
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {petals.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: '-5%',
            width: p.size,
            height: p.size * 1.3,
            opacity: p.opacity,
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, Math.sin(p.id) * 45, Math.cos(p.id) * -35, 0],
            rotate: [p.rotateStart, p.rotateEnd],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        >
          {/* Stylized Rose Petal SVG Shape */}
          <svg
            viewBox="0 0 30 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm"
          >
            <path
              d="M15 0 C25 8 30 22 24 34 C18 42 6 38 2 28 C-2 16 5 4 15 0 Z"
              fill={p.color}
              fillOpacity="0.8"
            />
            <path
              d="M15 4 C22 10 24 22 19 32 C15 38 8 34 5 26"
              stroke="#ffffff"
              strokeWidth="0.75"
              strokeOpacity="0.4"
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};
