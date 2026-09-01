import React, { useEffect, useRef, useState } from 'react';
import { Music, VolumeX, Sparkles } from 'lucide-react';

interface BackgroundMusicProps {
  /** Starts the music once true (triggered after the doors open) */
  active: boolean;
}

const STORAGE_MUTE_KEY = 'wedding_music_muted';
const TARGET_VOLUME = 0.45;

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({ active }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAutoplayPrompt, setShowAutoplayPrompt] = useState(false);
  const fadeIntervalRef = useRef<number | null>(null);

  // Fade volume utility
  const fadeAudio = (target: number, durationMs: number = 1200, onComplete?: () => void) => {
    if (!audioRef.current) return;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const startVol = audioRef.current.volume;
    const stepTime = 50;
    const steps = durationMs / stepTime;
    const delta = (target - startVol) / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      if (!audioRef.current) return;
      currentStep++;
      const nextVol = Math.max(0, Math.min(1, startVol + delta * currentStep));
      audioRef.current.volume = nextVol;

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        audioRef.current.volume = target;
        onComplete?.();
      }
    }, stepTime);
  };

  useEffect(() => {
    if (!audioRef.current) {
      const el = new Audio('/assets/BG_AUDIO.mp3');
      el.loop = true;
      el.volume = 0;
      audioRef.current = el;
    }
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!active || !audioRef.current) return;

    // Check if user previously muted
    const isMuted = localStorage.getItem(STORAGE_MUTE_KEY) === 'true';
    if (isMuted) {
      setIsPlaying(false);
      return;
    }

    audioRef.current.volume = 0;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setShowAutoplayPrompt(false);
        fadeAudio(TARGET_VOLUME, 1500);
      })
      .catch(() => {
        setIsPlaying(false);
        setShowAutoplayPrompt(true);
      });
  }, [active]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;

    if (el.paused || !isPlaying) {
      el.volume = 0;
      void el
        .play()
        .then(() => {
          setIsPlaying(true);
          setShowAutoplayPrompt(false);
          localStorage.setItem(STORAGE_MUTE_KEY, 'false');
          fadeAudio(TARGET_VOLUME, 1200);
        })
        .catch(() => setIsPlaying(false));
    } else {
      localStorage.setItem(STORAGE_MUTE_KEY, 'true');
      fadeAudio(0, 800, () => {
        el.pause();
        setIsPlaying(false);
      });
    }
  };

  if (!active) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2">
      {/* Autoplay blocked prompt pill */}
      {showAutoplayPrompt && !isPlaying && (
        <button
          onClick={toggle}
          className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#f2b8c6] shadow-md text-xs font-label uppercase tracking-wider text-[#b05570] font-semibold flex items-center gap-1.5 animate-bounce cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#e08aa3]" />
          <span>Tap for music</span>
        </button>
      )}

      {/* Floating Audio Toggle Button */}
      <button
        onClick={toggle}
        aria-label={isPlaying ? 'Turn music off' : 'Turn music on'}
        title={isPlaying ? 'Turn music off' : 'Turn music on'}
        className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md border border-[#f2b8c6]/70 shadow-lg flex items-center justify-center text-[#b05570] active:scale-95 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e08aa3]"
      >
        {isPlaying ? (
          <Music className="w-4.5 h-4.5 animate-pulse text-[#e08aa3]" />
        ) : (
          <VolumeX className="w-4.5 h-4.5 text-gray-400" />
        )}
      </button>
    </div>
  );
};
