import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Card3D } from '@/components/common/Card3D';
import invitationVideo from '@/assets/invitation-video.mp4.asset.json';

export const VideoSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl mx-auto my-6 px-3"
    >
      <Card3D className="py-7 px-5 sm:px-8 text-center">
        <span className="font-label text-[10px] uppercase tracking-[0.35em] text-[#e79db0] font-semibold">
          A Little Something For You
        </span>

        <div className="relative mt-5 mx-auto max-w-xs rounded-2xl overflow-hidden border border-[#f2b8c6]/50 shadow-lg bg-[#fff5f9]">
          <video
            ref={videoRef}
            src={invitationVideo.url}
            className="w-full h-auto block"
            autoPlay
            muted
            loop
            playsInline
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs border border-[#f2b8c6]/60 shadow-md flex items-center justify-center text-[#b05570] active:scale-95 transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs border border-[#f2b8c6]/60 shadow-md flex items-center justify-center text-[#b05570] active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <p className="font-serif italic text-xs text-[#a8808e] mt-4">
          Tap the speaker to hear our little message
        </p>
      </Card3D>
    </motion.section>
  );
};
