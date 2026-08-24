import { motion } from "framer-motion";
import { useMemo } from "react";

const BLOBS = [
  { c: "#f7c9d3", x: "8%", y: "6%", s: 420 },
  { c: "#fadfd0", x: "72%", y: "12%", s: 380 },
  { c: "#f3b9c8", x: "20%", y: "38%", s: 460 },
  { c: "#fbe3d6", x: "80%", y: "48%", s: 400 },
  { c: "#f6c8d8", x: "5%", y: "68%", s: 440 },
  { c: "#fad9c9", x: "60%", y: "76%", s: 360 },
  { c: "#f2bccb", x: "38%", y: "88%", s: 420 },
  { c: "#fce6dc", x: "88%", y: "88%", s: 340 },
];

export function BackgroundCanvas() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            left: b.x,
            top: b.y,
            width: b.s,
            height: b.s,
            background: b.c,
            opacity: 0.18,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 20, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{
            duration: 26 + i * 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function Petal({ delay, left, size, drift, duration, tone }: {
  delay: number;
  left: number;
  size: number;
  drift: number;
  duration: number;
  tone: string;
}) {
  return (
    <motion.div
      className="absolute top-[-8%]"
      style={{ left: `${left}%` }}
      initial={{ y: "-10vh", opacity: 0, rotate: 0 }}
      animate={{
        y: "110vh",
        x: [0, drift, -drift * 0.6, drift * 0.4],
        opacity: [0, 0.9, 0.9, 0],
        rotate: [0, 180, 360],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2c5 4 8 8 8 12a8 8 0 0 1-16 0c0-4 3-8 8-12z"
          fill={tone}
          opacity="0.75"
        />
      </svg>
    </motion.div>
  );
}

export function FloatingPetals({ count = 28 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        delay: (i % 14) * 1.2 + Math.random() * 3,
        left: Math.random() * 100,
        size: 10 + Math.random() * 16,
        drift: 20 + Math.random() * 60,
        duration: 14 + Math.random() * 14,
        tone: (["#e8a4b4", "#f6c9d4", "#d98aa0", "#fbdbe2"][i % 4] as string),
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {petals.map((p, i) => (
        <Petal key={i} {...p} />
      ))}
    </div>
  );
}
