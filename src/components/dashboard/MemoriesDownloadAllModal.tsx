import React, { useState, useEffect } from 'react';
import { X, Download, Archive, CheckCircle, RefreshCw, FileArchive } from 'lucide-react';
import { WeddingEvent } from '@/lib/memoriesTypes';
import { formatBytes } from '@/lib/memoriesService';
import { supabase } from '@/lib/supabase';

interface MemoriesDownloadAllModalProps {
  event: WeddingEvent;
  onClose: () => void;
}

interface ArchivePart {
  part: number;
  totalParts: number;
  fileCount: number;
  totalBytes: number;
  downloadUrl: string;
  filename: string;
}

export const MemoriesDownloadAllModal: React.FC<MemoriesDownloadAllModalProps> = ({
  event,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [parts, setParts] = useState<ArchivePart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloadedParts, setDownloadedParts] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function loadParts() {
      setIsLoading(true);
      setError(null);

      try {
        const session = await supabase?.auth.getSession();
        const token = session?.data?.session?.access_token;
        const queryUrl = `/api/memories/archive?eventId=${encodeURIComponent(event.id)}&action=parts${token ? `&token=${encodeURIComponent(token)}` : ''}`;
        const res = await fetch(queryUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const json = await res.json();
          setParts(json.parts || []);
        } else {
          const errJson = await res.json().catch(() => ({}));
          setError(errJson.error || 'No memories found to archive.');
        }
      } catch (err: any) {
        setError(err.message || 'Could not prepare download archives.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadParts();
  }, [event.id]);

  const handleDownloadPart = async (part: ArchivePart) => {
    setDownloadedParts((prev) => new Set(prev).add(part.part));
    let targetUrl = part.downloadUrl;
    if (!targetUrl.includes('token=')) {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (token) {
        targetUrl += `${targetUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
      }
    }
    window.location.href = targetUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4a3038]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#e08aa3]/30 text-left">
        <div className="flex items-center justify-between pb-4 border-b border-[#e08aa3]/20 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#fff2f6] text-[#b05570]">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#4a3038]">
                Download All Memories
              </h2>
              <p className="text-xs text-[#7a4d5d]">
                Packaged into collision-free ZIP archives
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-[#e08aa3] animate-spin" />
            <p className="font-label text-xs uppercase tracking-wider text-[#b592a0]">
              Preparing archive parts...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-center">
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-xl bg-white border border-rose-300 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : parts.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7a4d5d]">
            No approved memories are available for download yet.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#7a4d5d] leading-relaxed">
              To guarantee fast and reliable downloads without browser timeouts, the memories have been split into{' '}
              <strong>{parts.length} ZIP {parts.length === 1 ? 'part' : 'parts'}</strong>:
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {parts.map((p) => {
                const isDownloaded = downloadedParts.has(p.part);

                return (
                  <div
                    key={p.part}
                    className="p-3.5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileArchive className="w-8 h-8 text-[#e08aa3] shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#4a3038]">
                          {p.filename}
                        </p>
                        <p className="text-[11px] text-[#7a4d5d]">
                          {p.fileCount} files • {formatBytes(p.totalBytes)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadPart(p)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
                        isDownloaded
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-[#e08aa3] hover:bg-[#d17e92] text-white'
                      }`}
                    >
                      {isDownloaded ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
