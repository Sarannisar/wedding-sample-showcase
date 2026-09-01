import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import { downloadCalendarIcs } from '@/lib/calendar';
import { notify } from '@/lib/notify';
import confetti from 'canvas-confetti';
import { Sparkles, Calendar, CalendarCheck } from 'lucide-react';

interface DateScratchCardProps {
  onRevealed?: () => void;
  isRevealed?: boolean;
}

export const DateScratchCard: React.FC<DateScratchCardProps> = ({
  onRevealed,
  isRevealed = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(isRevealed || Boolean(prefersReducedMotion));
  const [isDrawing, setIsDrawing] = useState(false);

  const event = weddingConfig.event;

  const triggerReveal = () => {
    if (revealed) return;
    setRevealed(true);
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f2b8c6', '#f9dde5', '#e08aa3', '#fff2f6'],
      });
    }
    if (onRevealed) onRevealed();
  };

  useEffect(() => {
    if (revealed || prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = rect.width || 360;
    const height = rect.height || 200;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    // Draw luxury brushed gold metallic gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#f0a8bd');
    grad.addColorStop(0.3, '#fce4ec');
    grad.addColorStop(0.5, '#f2b8c6');
    grad.addColorStop(0.7, '#f7c6d5');
    grad.addColorStop(1, '#e08fa8');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle striped brush texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let i = -height; i < width + height; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }

    // Text on gold scratch foil
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#73404f';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('DATE', width / 2, height / 2 - 20);

    ctx.font = 'italic 17px Georgia, serif';
    ctx.fillStyle = '#8a4f61';
    ctx.fillText('Scratch to Reveal', width / 2, height / 2 + 12);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#a86478';
    ctx.fillText('✦', width / 2, height / 2 + 36);

    let scratchedPixels = 0;
    const totalPixels = width * height;

    const scratch = (clientX: number, clientY: number) => {
      const box = canvas.getBoundingClientRect();
      const x = clientX - box.left;
      const y = clientY - box.top;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      scratchedPixels += Math.PI * 26 * 26 * 0.4;
      if (scratchedPixels / totalPixels > 0.35) {
        triggerReveal();
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      setIsDrawing(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      scratch(clientX, clientY);
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing && !('touches' in e)) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      scratch(clientX, clientY);
    };

    const handlePointerUp = () => {
      setIsDrawing(false);
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
    canvas.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      canvas.removeEventListener('touchstart', handlePointerDown);
      canvas.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [revealed, isDrawing, prefersReducedMotion]);

  const handleDownloadCalendar = () => {
    downloadCalendarIcs();
    notify.success('Downloaded calendar event file (.ics)');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
      aria-label="Wedding Date and Time"
    >
      {/* Framed Insha Allah Badge Above Date */}
      <div className="flex justify-center mb-4">
        <div className="px-6 py-2 rounded-xl border border-[#f2b8c6]/40 bg-[#fff6f9]/90 shadow-xs text-center">
          <p className="font-arabic text-2xl text-[#b05570]">
            {weddingConfig.cultural.inshaAllah.arabic}
          </p>
          <p className="font-serif italic text-xs text-[#a8808e] tracking-wider mt-0.5">
            {weddingConfig.cultural.inshaAllah.transliteration}
          </p>
        </div>
      </div>

      <Card3D className="text-center py-6 px-4 sm:px-8">
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold block mb-3">
          WEDDING DATE & TIME
        </span>

        <div
          ref={containerRef}
          className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden shadow-inner border border-[#f2b8c6]/30 bg-gradient-to-br from-[#fffafc] via-[#fffdfe] to-[#fff6f9] flex flex-col items-center justify-center select-none"
        >
          {/* Revealed Date Content Beneath Foil */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
            <div className="w-10 h-10 rounded-full bg-[#fdeef3] flex items-center justify-center text-[#dd8ea5] mb-2 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>

            <span className="font-label text-[10px] uppercase tracking-widest text-[#a8808e] font-bold">
              Mark Your Calendar
            </span>

            <h3 className="font-serif text-2xl sm:text-3xl text-[#4a3038] font-bold mt-1 tracking-wide">
              {event.dayAndDate}
            </h3>

            <p className="font-serif italic text-sm text-[#dd8ea5] font-semibold mt-1">
              {event.time}
            </p>
          </div>

          {/* Gold Scratch Canvas Overlay */}
          <AnimatePresence>
            {!revealed && (
              <motion.canvas
                ref={canvasRef}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.6 }}
                aria-label="Scratch surface to reveal date"
                role="button"
                className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10 touch-none rounded-2xl focus-visible:ring-2 focus-visible:ring-[#e08aa3]"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Action button */}
        {revealed ? (
          <button
            onClick={handleDownloadCalendar}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-label uppercase tracking-widest text-[#e79db0] hover:text-[#b05570] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e08aa3] rounded-lg px-2 py-1"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Add to Calendar</span>
          </button>
        ) : (
          <button
            onClick={triggerReveal}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-label uppercase tracking-widest text-[#e79db0] hover:text-[#b05570] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e08aa3] rounded-lg px-2 py-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Or Tap to Reveal Date</span>
          </button>
        )}
      </Card3D>
    </motion.section>
  );
};
