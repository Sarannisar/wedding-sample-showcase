import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import { Sparkles, Heart, Clock } from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type EventStage = 'countdown' | 'today' | 'happening' | 'past';

export const CountdownSection: React.FC = () => {
  const [stage, setStage] = useState<EventStage>('countdown');
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const targetDateObj = new Date(weddingConfig.event.targetDate);
    const targetTime = targetDateObj.getTime();
    // Event ends ~6 hours after start time
    const endTime = targetTime + 6 * 60 * 60 * 1000;

    // Start of the event day (midnight)
    const dayStart = new Date(targetDateObj);
    dayStart.setHours(0, 0, 0, 0);
    const dayStartTime = dayStart.getTime();

    const calculateTime = () => {
      const now = new Date().getTime();

      if (now >= endTime) {
        setStage('past');
        return true; // Stop interval
      } else if (now >= targetTime && now < endTime) {
        setStage('happening');
        return false;
      } else if (now >= dayStartTime && now < targetTime) {
        setStage('today');
        const difference = targetTime - now;
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days: 0, hours, minutes, seconds });
        return false;
      } else {
        setStage('countdown');
        const difference = targetTime - now;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / (1000 * 60)) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
        return false;
      }
    };

    const isFinished = calculateTime();
    if (isFinished) return;

    const interval = setInterval(() => {
      const shouldStop = calculateTime();
      if (shouldStop) clearInterval(interval);
    }, 1000);

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
      aria-live="polite"
      aria-label="Wedding Countdown"
    >
      <Card3D className="text-center py-8 px-4 sm:px-8">
        {stage === 'countdown' && (
          <>
            <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold block mb-5">
              Counting Down to the Blessed Moment
            </span>

            {/* Live Display Numbers Grid */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
              {timeUnits.map((unit) => (
                <div
                  key={unit.label}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#fff6f9]/90 border border-[#f2b8c6]/30 shadow-xs"
                >
                  <span
                    style={{
                      fontSize: 'clamp(26px, 6vw, 44px)',
                      lineHeight: '1.1',
                    }}
                    className="font-serif font-light text-[#dd8ea5] tabular-nums"
                  >
                    {String(unit.value).padStart(2, '0')}
                  </span>
                  <span className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-[#a8808e] mt-1 font-semibold">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {stage === 'today' && (
          <div className="space-y-3 py-2">
            <div className="w-12 h-12 rounded-full bg-[#fdeef3] mx-auto flex items-center justify-center text-[#e08aa3]">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-serif text-2xl font-bold text-[#4a3038]">
              It's Today, Insha Allah!
            </h4>
            <p className="font-serif text-sm text-[#704655] max-w-sm mx-auto">
              We look forward to welcoming you at {weddingConfig.event.time} at {weddingConfig.event.venue.name}.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fff2f6] border border-[#f2b8c6]/40 text-xs font-label uppercase tracking-wider text-[#b05570] font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Starting in {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </span>
            </div>
          </div>
        )}

        {stage === 'happening' && (
          <div className="space-y-3 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="font-serif text-2xl font-bold text-[#4a3038]">
              Happening Now
            </h4>
            <p className="font-serif text-sm text-[#704655]">
              Celebrating the blessed union of {weddingConfig.couple.bride} & {weddingConfig.couple.groom}
            </p>
          </div>
        )}

        {stage === 'past' && (
          <div className="space-y-3 py-2">
            <div className="w-12 h-12 rounded-full bg-[#fdeef3] text-[#e08aa3] mx-auto flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-2xl font-bold text-[#4a3038]">
              Thank You for Celebrating With Us
            </h4>
            <p className="font-serif text-sm text-[#704655]">
              The wedding ceremony has concluded. May Allah bless you for your presence, prayers, and heartfelt wishes.
            </p>
          </div>
        )}
      </Card3D>
    </motion.section>
  );
};
