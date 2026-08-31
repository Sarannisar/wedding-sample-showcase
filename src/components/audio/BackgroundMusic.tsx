import React, { useEffect, useRef, useState } from 'react';
import { Music, VolumeX } from 'lucide-react';

interface BackgroundMusicProps {
  /** Starts the music once true (triggered after the doors open) */
  active: boolean;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({ active }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioRef.current) {
      const el = new Audio('/assets/BG_AUDIO.mp3');
      el.loop = true;
      el.volume = 0.5;
      audioRef.current = el;
    }
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!active || !audioRef.current) return;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [active]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  if (!active) return null;

  return (
    <button
      onClick={toggle}
      aria-label={isPlaying ? 'Turn music off' : 'Turn music on'}
      title={isPlaying ? 'Turn music off' : 'Turn music on'}
      className="fixed bottom-5 right-5 z-[60] w-11 h-11 rounded-full bg-white/90 backdrop-blur-md border border-[#f2b8c6]/70 shadow-lg flex items-center justify-center text-[#b05570] active:scale-95 transition cursor-pointer"
    >
      {isPlaying ? (
        <Music className="w-4.5 h-4.5 animate-pulse" />
      ) : (
        <VolumeX className="w-4.5 h-4.5 text-gray-400" />
      )}
    </button>
  );
};

