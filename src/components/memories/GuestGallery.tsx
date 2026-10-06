import React, { useState, useEffect } from 'react';
import {
  Images,
  Video,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Film,
} from 'lucide-react';
import { MemoryUpload } from '@/lib/memoriesTypes';
import { fetchApprovedMemories, formatBytes, resolveMediaUrl } from '@/lib/memoriesService';
import { formatRelativeTime } from '@/lib/utils';

interface GuestGalleryProps {
  eventId: string;
  allowDownloads: boolean;
}

export const GuestGallery: React.FC<GuestGalleryProps> = ({ eventId, allowDownloads }) => {
  const [memories, setMemories] = useState<MemoryUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await fetchApprovedMemories(eventId);
      setMemories(data);
      setIsLoading(false);
    }
    void load();
  }, [eventId]);

  const filteredMemories = memories.filter((m) => {
    if (filter === 'all') return true;
    return m.media_type === filter;
  });

  const getMediaUrl = (item: MemoryUpload, download = false) => resolveMediaUrl(item, download);

  const handleNext = () => {
    if (activeItemIndex === null) return;
    setActiveItemIndex((prev) => ((prev! + 1) % filteredMemories.length));
  };

  const handlePrev = () => {
    if (activeItemIndex === null) return;
    setActiveItemIndex((prev) =>
      prev! === 0 ? filteredMemories.length - 1 : prev! - 1
    );
  };

  const activeItem = activeItemIndex !== null ? filteredMemories[activeItemIndex] : null;

  return (
    <section id="wedding-gallery-section" className="mt-12 pt-8 border-t border-[#e08aa3]/20">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#4a3038] flex items-center gap-2">
            <Images className="w-6 h-6 text-[#e08aa3]" />
            <span>Wedding Memories Gallery</span>
          </h2>
          <p className="font-body text-xs sm:text-sm text-[#7a4d5d]">
            Moments captured with love by our cherished guests.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#fff2f6] border border-[#e08aa3]/20">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-[#e08aa3] text-white shadow-sm'
                : 'text-[#7a4d5d] hover:text-[#4a3038]'
            }`}
          >
            All ({memories.length})
          </button>
          <button
            onClick={() => setFilter('photo')}
            className={`px-3 py-1 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition cursor-pointer ${
              filter === 'photo'
                ? 'bg-[#e08aa3] text-white shadow-sm'
                : 'text-[#7a4d5d] hover:text-[#4a3038]'
            }`}
          >
            Photos ({memories.filter((m) => m.media_type === 'photo').length})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-3 py-1 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition cursor-pointer ${
              filter === 'video'
                ? 'bg-[#e08aa3] text-white shadow-sm'
                : 'text-[#7a4d5d] hover:text-[#4a3038]'
            }`}
          >
            Videos ({memories.filter((m) => m.media_type === 'video').length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-[#fff2f6] border border-[#e08aa3]/20"
            />
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="p-10 rounded-3xl bg-white/70 border border-[#e08aa3]/20 text-center">
          <Film className="w-10 h-10 text-[#e08aa3] mx-auto mb-2 opacity-60" />
          <p className="font-display text-base font-bold text-[#4a3038]">
            No approved memories yet
          </p>
          <p className="text-xs text-[#7a4d5d] mt-1">
            Be the first guest to share photos &amp; videos using the form above!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredMemories.map((item, index) => (
            <div
              key={item.id}
              onClick={() => setActiveItemIndex(index)}
              className="group aspect-square rounded-2xl bg-white border border-[#e08aa3]/20 overflow-hidden relative shadow-sm hover:shadow-card-hover transition-all cursor-pointer"
            >
              {item.media_type === 'photo' ? (
                <img
                  src={getMediaUrl(item)}
                  alt={item.original_filename}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23fff2f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23b05570">Photo</text></svg>';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-[#4a3038] flex flex-col items-center justify-center text-white relative">
                  <Video className="w-10 h-10 text-[#f7c1d0] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-label uppercase tracking-widest text-[#f7c1d0] mt-1">
                    Play Video
                  </span>
                </div>
              )}

              {/* Gradient Overlay with Guest Name & Meta */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white text-xs">
                {item.guest_name && (
                  <p className="font-semibold truncate flex items-center gap-1">
                    <User className="w-3 h-3 text-[#f7c1d0]" />
                    <span>{item.guest_name}</span>
                  </p>
                )}
                <p className="text-[10px] text-white/80">
                  {formatRelativeTime(item.uploaded_at)}
                </p>
              </div>

              {/* Type Badge */}
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-[9px] font-label uppercase tracking-wider text-white">
                {item.media_type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Fullscreen Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
            <div>
              <p className="font-semibold text-sm truncate max-w-xs sm:max-w-md">
                {activeItem.guest_name ? `Shared by ${activeItem.guest_name}` : activeItem.original_filename}
              </p>
              <p className="text-[11px] text-white/60">
                {formatRelativeTime(activeItem.uploaded_at)} • {formatBytes(activeItem.file_size)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {allowDownloads && (
                <a
                  href={getMediaUrl(activeItem, true)}
                  download={activeItem.original_filename}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Download Original"
                >
                  <Download className="w-5 h-5" />
                </a>
              )}
              <button
                onClick={() => setActiveItemIndex(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-rose-600/80 text-white transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Container */}
          <div className="flex-1 flex items-center justify-center p-2 relative min-h-0">
            {activeItem.media_type === 'photo' ? (
              <img
                src={getMediaUrl(activeItem)}
                alt={activeItem.original_filename}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <video
                src={getMediaUrl(activeItem)}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl shadow-2xl bg-black"
              />
            )}

            {/* Left / Right Navigation */}
            {filteredMemories.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition cursor-pointer"
                  title="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Counter */}
          <div className="text-center text-xs text-white/50 pt-2">
            {activeItemIndex! + 1} of {filteredMemories.length}
          </div>
        </div>
      )}
    </section>
  );
};
