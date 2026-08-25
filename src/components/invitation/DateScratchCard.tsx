import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card3D } from '@/components/common/Card3D';
import { weddingConfig } from '@/config/weddingConfig';
import confetti from 'canvas-confetti';
import { Sparkles, Calendar } from 'lucide-react';

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
  const [revealed, setRevealed] = useState(isRevealed);
  const [isDrawing, setIsDrawing] = useState(false);

  const event = weddingConfig.event;

  const triggerReveal = () => {
    if (revealed) return;
    setRevealed(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#c59b6d', '#e8d4be', '#b05570', '#fdf0f3'],
    });
    if (onRevealed) onRevealed();
  };

  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 360;
    canvas.height = rect.height || 200;

    // Draw luxury brushed gold metallic gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#d4af37');
    grad.addColorStop(0.3, '#f3e5ab');
    grad.addColorStop(0.5, '#c59b6d');
    grad.addColorStop(0.7, '#e6ca65');
    grad.addColorStop(1, '#b8860b');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle striped brush texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let i = -canvas.height; i < canvas.width + canvas.height; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvas.height, canvas.height);
      ctx.stroke();
    }

    // Text on gold scratch foil
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a2c11';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('DATE', canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = 'italic 17px Georgia, serif';
    ctx.fillStyle = '#5c3a1e';
    ctx.fillText('Scratch to Reveal', canvas.width / 2, canvas.height / 2 + 12);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#7a4e29';
    ctx.fillText('✦', canvas.width / 2, canvas.height / 2 + 36);

    let scratchedPixels = 0;
    const totalPixels = canvas.width * canvas.height;

    const scratch = (clientX: number, clientY: number) => {
      const box = canvas.getBoundingClientRect();
      const x = clientX - box.left;
      const y = clientY - box.top;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();

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
  }, [revealed, isDrawing]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      {/* Framed Insha Allah Badge Above Date */}
      <div className="flex justify-center mb-4">
        <div className="px-6 py-2 rounded-xl border border-[#c59b6d]/40 bg-[#fbf8f2]/90 shadow-xs text-center">
          <p className="font-arabic text-2xl text-[#7d334a]">
            {weddingConfig.cultural.inshaAllah.arabic}
          </p>
          <p className="font-serif italic text-xs text-[#8c6d58] tracking-wider mt-0.5">
            {weddingConfig.cultural.inshaAllah.transliteration}
          </p>
        </div>
      </div>

      <Card3D className="text-center py-6 px-4 sm:px-8">
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#a07855] font-semibold block mb-3">
          WEDDING DATE & TIME
        </span>

        <div
          ref={containerRef}
          className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden shadow-inner border border-[#c59b6d]/30 bg-gradient-to-br from-[#fdfbf7] via-[#fffdf9] to-[#fbf7f0] flex flex-col items-center justify-center select-none"
        >
          {/* Revealed Date Content Beneath Foil */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
            <div className="w-10 h-10 rounded-full bg-[#f4ece1] flex items-center justify-center text-[#9d6b47] mb-2 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>

            <span className="font-label text-[10px] uppercase tracking-widest text-[#8c6d58] font-bold">
              Mark Your Calendar
            </span>

            <h3 className="font-serif text-2xl sm:text-3xl text-[#2d1a22] font-bold mt-1 tracking-wide">
              {event.dayAndDate}
            </h3>

            <p className="font-serif italic text-sm text-[#9d6b47] font-semibold mt-1">
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
                className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-10 touch-none rounded-2xl"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Action button if guest prefers tap */}
        {!revealed && (
          <button
            onClick={triggerReveal}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-label uppercase tracking-widest text-[#a07855] hover:text-[#7d334a] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Or Tap to Reveal Date</span>
          </button>
        )}
      </Card3D>
    </motion.section>
  );
};
