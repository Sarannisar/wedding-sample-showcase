import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Heart, Camera, Video, Maximize, Play, Pause } from 'lucide-react';
import { WeddingEvent, MemoryUpload } from '@/lib/memoriesTypes';
import { fetchWeddingEvent, fetchApprovedMemories, resolveMediaUrl } from '@/lib/memoriesService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { weddingConfig } from '@/config/weddingConfig';

export const LiveWeddingDisplayPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [memories, setMemories] = useState<MemoryUpload[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<'slideshow' | 'grid'>('slideshow');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://whisper-rsvp.lovable.app';
  const memoriesUrl = event ? `${origin}/memories/${event.slug}` : `${origin}/memories`;

  // 1. Initial Load
  useEffect(() => {
    async function init() {
      const ev = await fetchWeddingEvent(eventSlug || weddingConfig.defaultEventSlug);
      setEvent(ev);
      const data = await fetchApprovedMemories(ev.id);
      setMemories(data);
    }
    void init();
  }, [eventSlug]);

  // 2. Realtime Subscription & Polling
  useEffect(() => {
    if (!event) return;

    const refreshData = async () => {
      const data = await fetchApprovedMemories(event.id);
      setMemories(data);
    };

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`live-memories-${event.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'memory_uploads', filter: `event_id=eq.${event.id}` },
          () => {
            void refreshData();
          }
        )
        .subscribe();

      const poll = setInterval(refreshData, 10000);
      return () => {
        supabase?.removeChannel(channel);
        clearInterval(poll);
      };
    } else {
      const poll = setInterval(refreshData, 10000);
      return () => clearInterval(poll);
    }
  }, [event]);

  // 3. Slideshow Auto-advance
  useEffect(() => {
    if (!isPlaying || memories.length <= 1 || viewMode !== 'slideshow') return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % memories.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isPlaying, memories.length, viewMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getMediaUrl = (item: MemoryUpload) => resolveMediaUrl(item);

  const currentItem = memories.length > 0 ? memories[currentIndex] : null;

  if (event && event.live_display_enabled === false) {
    return (
      <div className="h-screen w-screen bg-[#2d1b22] text-white flex flex-col items-center justify-center p-6 text-center select-none relative font-body">
        <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center text-[#f7c1d0] mb-4">
          <Heart className="w-8 h-8 fill-[#e08aa3] text-[#e08aa3]" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">{weddingConfig.couple.bride} &amp; {weddingConfig.couple.groom}</h1>
        <p className="font-script text-xl text-[#f7c1d0] mb-6">Live Wedding Showcase</p>
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 max-w-md backdrop-blur-md">
          <p className="font-display text-lg font-bold text-white mb-1">Live Display Paused</p>
          <p className="text-xs text-[#f7c1d0]/80">
            The wedding hosts have temporarily paused the big screen display. It will resume shortly!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#2d1b22] text-white flex flex-col justify-between overflow-hidden relative font-body select-none">
      {/* Background Soft Glow & Petal Ambience */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#e08aa3]/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#b05570]/25 to-transparent blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="px-8 py-5 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#f7c1d0]">
            <Heart className="w-6 h-6 fill-[#e08aa3] text-[#e08aa3]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-white">
              {weddingConfig.couple.bride} &amp; {weddingConfig.couple.groom}
            </h1>
            <p className="font-label text-xs uppercase tracking-widest text-[#f7c1d0]/80">
              Live Wedding Memories Drop
            </p>
          </div>
        </div>

        {/* Live Counter & Controls */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-label text-xs uppercase tracking-wider text-white">
              {memories.length} {memories.length === 1 ? 'Memory' : 'Memories'} Shared
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 rounded-xl p-1 border border-white/15">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg hover:bg-white/20 transition cursor-pointer text-white"
              title={isPlaying ? 'Pause Slideshow' : 'Resume Slideshow'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'slideshow' ? 'grid' : 'slideshow')}
              className="px-2.5 py-1 text-xs font-label uppercase tracking-wider hover:bg-white/20 rounded-lg transition cursor-pointer"
            >
              {viewMode === 'slideshow' ? 'Grid' : 'Slideshow'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/20 transition cursor-pointer text-white"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Showcase Area */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden z-10">
        {memories.length === 0 ? (
          <div className="text-center p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md max-w-lg">
            <Camera className="w-16 h-16 text-[#f7c1d0] mx-auto mb-4 animate-bounce" />
            <h2 className="font-display text-3xl font-bold mb-2">Be the First to Share!</h2>
            <p className="text-sm text-[#f7c1d0]/80 leading-relaxed mb-6">
              Scan the QR code on your phone screen to upload candid photos and videos directly to this screen.
            </p>
          </div>
        ) : viewMode === 'slideshow' && currentItem ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Display Media Item */}
            <div className="h-[74vh] max-w-[85vw] flex items-center justify-center relative group">
              {currentItem.media_type === 'photo' ? (
                <img
                  key={currentItem.id}
                  src={getMediaUrl(currentItem)}
                  alt={currentItem.original_filename}
                  className="max-h-full max-w-full object-contain rounded-3xl shadow-2xl transition-all duration-700 animate-fade-in"
                />
              ) : (
                <video
                  key={currentItem.id}
                  src={getMediaUrl(currentItem)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-h-full max-w-full rounded-3xl shadow-2xl bg-black"
                />
              )}

              {/* Memory Caption Tag */}
              {currentItem.guest_name && (
                <div className="absolute bottom-6 left-6 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white shadow-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#f7c1d0]" />
                  <span className="font-display text-sm">
                    Captured with love by <strong>{currentItem.guest_name}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Grid View Mode */
          <div className="w-full h-full overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {memories.map((m, idx) => (
              <div
                key={m.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setViewMode('slideshow');
                }}
                className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/15 cursor-pointer relative group hover:scale-105 transition-transform"
              >
                {m.media_type === 'photo' ? (
                  <img
                    src={getMediaUrl(m)}
                    alt={m.original_filename}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/60">
                    <Video className="w-8 h-8 text-[#f7c1d0]" />
                  </div>
                )}
                {m.guest_name && (
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white truncate text-center">
                    {m.guest_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom QR Watermark & Prompt Footer */}
      <footer className="px-8 py-4 flex items-center justify-between z-20 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-3">
          <p className="font-script text-2xl text-[#f7c1d0]">
            Every moment with you is precious
          </p>
        </div>

        {/* Corner QR Widget */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl shadow-xl">
          <div className="p-1.5 bg-white rounded-xl">
            <QRCodeSVG
              value={memoriesUrl}
              size={64}
              level="M"
              fgColor="#2d1b22"
            />
          </div>
          <div className="text-left pr-2">
            <p className="font-label text-xs uppercase tracking-wider font-bold text-white">
              Scan to Drop Memories
            </p>
            <p className="text-[10px] text-[#f7c1d0]">
              No app or login needed
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LiveWeddingDisplayPage;
