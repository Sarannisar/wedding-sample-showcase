import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownSection: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(weddingConfig.event.targetDate).getTime();

    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="text-center py-8 px-4 sm:px-8">
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#a07855] font-semibold block mb-5">
          Counting Down to the Blessed Moment
        </span>

        {/* Live Display Numbers Grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
          {timeUnits.map((unit) => (
            <div
              key={unit.label}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#fbf8f2]/90 border border-[#c59b6d]/30 shadow-xs"
            >
              <span
                style={{
                  fontSize: 'clamp(26px, 6vw, 44px)',
                  lineHeight: '1.1',
                }}
                className="font-serif font-light text-[#9d6b47] tabular-nums"
              >
                {String(unit.value).padStart(2, '0')}
              </span>
              <span className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-[#8c6d58] mt-1 font-semibold">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      </Card3D>
    </motion.section>
  );
};
