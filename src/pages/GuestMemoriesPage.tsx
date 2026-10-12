import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Camera,
  Video,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Heart,
  Images,
  Trash2,
  FileWarning,
} from 'lucide-react';
import { fetchWeddingEvent, formatBytes } from '@/lib/memoriesService';
import { WeddingEvent, UploadBatchItem } from '@/lib/memoriesTypes';
import { validateFile, uploadSingleMemory } from '@/lib/memoriesUploadManager';
import { MemoriesPasscodeModal } from '@/components/memories/MemoriesPasscodeModal';
import { GuestGallery } from '@/components/memories/GuestGallery';
import { notify } from '@/lib/notify';
import { weddingConfig } from '@/config/weddingConfig';

export const GuestMemoriesPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [searchParams] = useSearchParams();

  const [event, setEvent] = useState<WeddingEvent | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);

  // Guest inputs
  const initialGuestName = searchParams.get('guest') || searchParams.get('name') || '';
  const [guestName, setGuestName] = useState(initialGuestName);

  // Selected files queue
  const [selectedFiles, setSelectedFiles] = useState<UploadBatchItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isUploadFinished, setIsUploadFinished] = useState(false);

  // Load event
  useEffect(() => {
    async function load() {
      setIsLoadingEvent(true);
      const data = await fetchWeddingEvent(eventSlug || weddingConfig.defaultEventSlug);
      setEvent(data);
      if (!data.passcode_enabled) {
        setIsPasscodeVerified(true);
      }
      setIsLoadingEvent(false);
    }
    void load();
  }, [eventSlug]);

  // Clean up preview object URLs when items change/unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !event) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const maxBatch = event.max_files_per_batch || 100;
    if (selectedFiles.length + files.length > maxBatch) {
      notify.error(`You can select at most ${maxBatch} files per batch.`);
      return;
    }

    const newItems: UploadBatchItem[] = files.map((file) => {
      const validation = validateFile(file, event);
      const previewUrl = validation.mediaType === 'photo' ? URL.createObjectURL(file) : '';

      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random()}`,
        file,
        previewUrl,
        originalFilename: file.name,
        mediaType: validation.mediaType,
        fileSize: file.size,
        mimeType: file.type,
        status: validation.valid ? 'queued' : 'failed',
        progress: 0,
        error: validation.error,
      };
    });

    setSelectedFiles((prev) => [...prev, ...newItems]);
    // Reset file input value so user can re-select same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveItem = (id: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleStartUpload = async () => {
    if (!event || selectedFiles.length === 0 || isUploading) return;

    const validItems = selectedFiles.filter((item) => item.status !== 'ready' && !item.error);
    if (validItems.length === 0) {
      notify.error('Please remove or fix invalid files before uploading.');
      return;
    }

    setIsUploading(true);
    setIsUploadFinished(false);
    setUploadIndex(0);
    setCompletedCount(0);
    setFailedCount(0);

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < validItems.length; i++) {
      const current = validItems[i];
      setUploadIndex(i + 1);

      // Update state to uploading
      setSelectedFiles((prev) =>
        prev.map((item) => (item.id === current.id ? { ...item, status: 'uploading', progress: 0 } : item))
      );

      const result = await uploadSingleMemory(current, event, guestName, (percent, loadedBytes) => {
        setSelectedFiles((prev) =>
          prev.map((item) => (item.id === current.id ? { ...item, progress: percent, loadedBytes } : item))
        );
      });

      if (result.success) {
        successes++;
        setCompletedCount(successes);
        setSelectedFiles((prev) =>
          prev.map((item) =>
            item.id === current.id
              ? { ...item, status: 'ready', progress: 100, loadedBytes: item.fileSize }
              : item
          )
        );
      } else {
        failures++;
        setFailedCount(failures);
        setSelectedFiles((prev) =>
          prev.map((item) =>
            item.id === current.id ? { ...item, status: 'failed', error: result.error || 'Upload failed' } : item
          )
        );
      }
    }

    setIsUploading(false);
    setIsUploadFinished(true);

    if (failures === 0) {
      notify.success('All memories uploaded successfully! ❤️');
    } else {
      notify.error(`${failures} file(s) could not be uploaded.`);
    }
  };

  const handleRetryFailed = async () => {
    // Reset failed items back to queued
    setSelectedFiles((prev) =>
      prev.map((item) =>
        item.status === 'failed' && !item.error?.includes('exceeds')
          ? { ...item, status: 'queued', progress: 0, error: undefined }
          : item
      )
    );
    setIsUploadFinished(false);
    void handleStartUpload();
  };

  const handleResetForMore = () => {
    setSelectedFiles([]);
    setIsUploadFinished(false);
    setCompletedCount(0);
    setFailedCount(0);
  };

  // Calculation helpers
  const totalBytes = selectedFiles.reduce((acc, curr) => acc + curr.fileSize, 0);
  const totalUploadedBytes = selectedFiles.reduce((acc, curr) => {
    if (curr.status === 'ready') return acc + curr.fileSize;
    if (curr.status === 'uploading') return acc + (curr.loadedBytes || 0);
    return acc;
  }, 0);
  const overallPercent =
    totalBytes > 0 ? Math.min(100, Math.round((totalUploadedBytes / totalBytes) * 100)) : 0;
  const photoCount = selectedFiles.filter((f) => f.mediaType === 'photo').length;
  const videoCount = selectedFiles.filter((f) => f.mediaType === 'video').length;
  const hasErrors = selectedFiles.some((f) => f.error);

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-[#fffafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#e08aa3]/30 border-t-[#e08aa3] animate-spin" />
          <p className="font-label text-xs uppercase tracking-widest text-[#b592a0]">
            Loading Wedding Memories...
          </p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#fffafc] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-[#e08aa3] mb-3" />
        <h1 className="font-display text-2xl text-[#4a3038] font-bold">Event Not Found</h1>
        <p className="text-sm text-[#7a4d5d] mt-2 max-w-sm mx-auto leading-relaxed">
          The wedding memories link appears to be invalid or expired. Please scan the QR code at your reception table or contact the host family.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffafc] text-[#4a3038] font-body relative overflow-x-hidden selection:bg-[#f7c1d0]/50 selection:text-[#4a3038]">
      {/* Optional Passcode Modal */}
      {event.passcode_enabled && !isPasscodeVerified && (
        <MemoriesPasscodeModal
          eventName={event.name}
          eventId={event.id}
          expectedHash={event.passcode_hash}
          onSuccess={() => setIsPasscodeVerified(true)}
        />
      )}

      {/* Background Decorative Petals & Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#f7c1d0]/30 to-[#fff2f6]/20 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-[#e08aa3]/15 to-transparent blur-2xl" />
      </div>

      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#fffafc]/85 backdrop-blur-md border-b border-[#e08aa3]/20 px-4 py-2.5">
        <div className="max-w-xl mx-auto relative flex items-center justify-between min-h-[40px]">
          {/* Left Element */}
          <div className="flex items-center gap-1.5 text-xs font-label uppercase tracking-widest text-[#b05570] z-10">
            <Camera className="w-4 h-4 text-[#e08aa3]" />
            <span className="hidden sm:inline font-semibold text-[11px]">Memories</span>
          </div>

          {/* Truly Dead-Centered Title (Mathematically Centered) */}
          <div className="absolute inset-x-0 mx-auto text-center pointer-events-none flex flex-col items-center justify-center">
            <span className="font-script text-xl sm:text-2xl text-[#b05570] block leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              {weddingConfig.couple.bride} &amp; {weddingConfig.couple.groom}
            </span>
            <span className="text-[9px] sm:text-[10px] font-label uppercase tracking-[0.28em] text-[#b592a0] block -mt-0.5">
              Memories Drop
            </span>
          </div>

          {/* Right Element */}
          <div className="flex items-center justify-end z-10">
            {event.gallery_enabled ? (
              <button
                onClick={() => {
                  const el = document.getElementById('wedding-gallery-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e08aa3]/30 bg-[#fff2f6]/80 hover:bg-[#fff2f6] text-xs font-label uppercase tracking-wider text-[#b05570] hover:text-[#4a3038] transition cursor-pointer shadow-xs active:scale-95"
              >
                <Images className="w-3.5 h-3.5 text-[#e08aa3]" />
                <span>Gallery</span>
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        {/* Uploads Disabled Warning */}
        {!event.upload_enabled && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm text-center">
            <p className="font-semibold">Uploads Currently Paused</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The wedding hosts have temporarily closed new photo &amp; video uploads.
            </p>
          </div>
        )}

        {/* Hero Header */}
        <section className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#fff2f6] border border-[#e08aa3]/30 text-[#b05570] text-xs font-label uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#e08aa3]" />
            <span>Guest Photo &amp; Video Drop</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl text-[#4a3038] font-bold tracking-tight mb-2">
            {event.name}
          </h1>

          <p className="font-body text-sm sm:text-base text-[#7a4d5d] max-w-md mx-auto leading-relaxed mb-3">
            {event.welcome_message || 'Share your favourite memories from our special wedding celebration.'}
          </p>

          <p className="font-script text-xl sm:text-2xl text-[#b05570] flex items-center justify-center gap-1.5">
            <span>Share your memories with us</span>
            <Heart className="w-4 h-4 fill-[#e08aa3] text-[#e08aa3] inline" />
          </p>
        </section>

        {/* Success State View */}
        {isUploadFinished && completedCount > 0 && (
          <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-white border border-[#e08aa3]/30 shadow-card-3d text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="font-display text-2xl text-[#4a3038] font-bold mb-1">
              Thank You! ❤️
            </h2>
            <p className="font-body text-sm text-[#7a4d5d] mb-4">
              Your memories have been added to our wedding collection.
            </p>

            <div className="p-3 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20 mb-6 text-xs text-[#7a4d5d] flex items-center justify-around">
              <div>
                <span className="block font-bold text-sm text-emerald-700">{completedCount}</span>
                <span>Uploaded</span>
              </div>
              {failedCount > 0 && (
                <div>
                  <span className="block font-bold text-sm text-rose-600">{failedCount}</span>
                  <span>Failed</span>
                </div>
              )}
            </div>

            {failedCount > 0 && (
              <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <p className="font-semibold">Some files could not be uploaded.</p>
                <button
                  onClick={handleRetryFailed}
                  className="mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-label uppercase text-xs tracking-wider font-semibold cursor-pointer active:scale-95"
                >
                  Retry Failed Uploads
                </button>
              </div>
            )}

            <button
              onClick={handleResetForMore}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#e08aa3] hover:bg-[#d17e92] text-white font-label uppercase text-xs tracking-widest font-semibold shadow-md active:scale-95 transition cursor-pointer"
            >
              Upload More Memories
            </button>
          </div>
        )}

        {/* Upload Form View */}
        {(!isUploadFinished || completedCount === 0) && event.upload_enabled && (
          <div className="space-y-6">
            {/* Optional Guest Name Input */}
            {event.allow_guest_name && (
              <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#e08aa3]/25 shadow-sm">
                <label className="block font-label text-xs uppercase tracking-widest text-[#7a4d5d] font-semibold mb-2">
                  Your Name <span className="text-[#b592a0] font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  disabled={isUploading}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Uncle Farhan or Aunt Zeenath"
                  maxLength={70}
                  className="w-full px-4 py-3 rounded-2xl border border-[#e08aa3]/30 focus:border-[#e08aa3] focus:ring-2 focus:ring-[#e08aa3]/20 outline-none text-sm bg-[#fffafc] text-[#4a3038] transition disabled:opacity-60"
                />
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File Selection Action Card */}
            {selectedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 sm:p-12 rounded-3xl border-2 border-dashed border-[#e08aa3]/50 bg-white/70 hover:bg-white hover:border-[#e08aa3] transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-sm active:scale-[0.99]"
              >
                <div className="w-20 h-20 rounded-full bg-[#fff2f6] border border-[#e08aa3]/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[#f7c1d0]/40 transition-all text-[#e08aa3]">
                  <Camera className="w-9 h-9 text-[#b05570]" />
                </div>

                <h3 className="font-display text-xl text-[#4a3038] font-bold mb-1">
                  Share Your Cherished Memories
                </h3>
                <p className="font-body text-xs text-[#7a4d5d] max-w-xs mb-4">
                  Tap to add your candid smiles, heartfelt toasts, and celebratory wedding moments.
                </p>

                <div className="flex items-center gap-3 text-[11px] font-label uppercase tracking-widest text-[#b592a0]">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-[#e08aa3]" />
                    Max {event.photo_size_limit_mb || 25}MB Photos
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-[#e08aa3]" />
                    Max {(event.video_size_limit_mb || 500) >= 1000 ? `${(event.video_size_limit_mb || 500) / 1000}GB` : `${event.video_size_limit_mb || 500}MB`} Videos
                  </span>
                </div>
              </div>
            ) : (
              /* Selected Files List & Review */
              <div className="p-4 sm:p-6 rounded-3xl bg-white border border-[#e08aa3]/30 shadow-card-3d">
                {/* Batch Header */}
                <div className="flex items-center justify-between border-b border-[#e08aa3]/20 pb-3 mb-4">
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-[#4a3038]">
                      {selectedFiles.length} {selectedFiles.length === 1 ? 'memory' : 'memories'} selected
                    </h3>
                    <p className="text-xs text-[#b592a0]">
                      {photoCount} photos, {videoCount} videos • {formatBytes(totalBytes)}
                    </p>
                  </div>

                  {!isUploading && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-[#fff2f6] hover:bg-[#f7c1d0]/50 text-[#b05570] text-xs font-label uppercase tracking-wider font-semibold transition cursor-pointer"
                    >
                      + Add More
                    </button>
                  )}
                </div>

                {/* Progress Bar (When Uploading) */}
                {isUploading && (
                  <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-[#fff2f6] border border-[#e08aa3]/30 shadow-sm animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs font-label uppercase tracking-wider font-semibold text-[#b05570] mb-2">
                      <div className="flex items-center gap-2">
                        <span>Uploading {uploadIndex} of {selectedFiles.length}</span>
                        <span className="text-[#e08aa3]">•</span>
                        <span className="font-mono font-bold text-[#4a3038] tracking-normal">
                          {formatBytes(totalUploadedBytes)} of {formatBytes(totalBytes)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#b05570] sm:text-right">
                        {overallPercent}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white border border-[#e08aa3]/20 overflow-hidden shadow-inner p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-[#e08aa3] to-[#b05570] transition-all duration-200 rounded-full"
                        style={{ width: `${overallPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Items Grid / List */}
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                        item.error
                          ? 'border-rose-300 bg-rose-50/70'
                          : item.status === 'ready'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-[#e08aa3]/20 bg-[#fffafc]'
                      }`}
                    >
                      {/* Thumbnail / Icon */}
                      <div className="w-12 h-12 rounded-xl bg-white border border-[#e08aa3]/20 flex items-center justify-center shrink-0 overflow-hidden relative">
                        {item.mediaType === 'photo' && item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.originalFilename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Video className="w-6 h-6 text-[#e08aa3]" />
                        )}
                        <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-black/60 text-[8px] text-white font-label uppercase rounded-tl">
                          {item.mediaType}
                        </span>
                      </div>

                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#4a3038] truncate">
                          {item.originalFilename}
                        </p>
                        <p className="text-[11px] text-[#7a4d5d]">
                          {formatBytes(item.fileSize)}
                        </p>

                        {/* Error Message */}
                        {item.error && (
                          <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                            <FileWarning className="w-3 h-3 shrink-0" />
                            <span className="truncate">{item.error}</span>
                          </p>
                        )}

                        {/* Individual Item Progress */}
                        {item.status === 'uploading' && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono text-[#b05570]">
                              <span>{formatBytes(item.loadedBytes || 0)} / {formatBytes(item.fileSize)}</span>
                              <span className="font-semibold">{item.progress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white border border-[#e08aa3]/20 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#e08aa3] to-[#b05570] transition-all duration-150 rounded-full"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status / Action Button */}
                      <div className="shrink-0 flex items-center">
                        {item.status === 'ready' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : item.status === 'uploading' ? (
                          <RefreshCw className="w-4 h-4 text-[#e08aa3] animate-spin" />
                        ) : !isUploading ? (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Primary Upload Button */}
                <div className="mt-6 space-y-2">
                  <button
                    onClick={handleStartUpload}
                    disabled={isUploading || hasErrors}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#e08aa3] to-[#b05570] hover:from-[#d17e92] hover:to-[#9c4b63] text-white font-label uppercase text-sm tracking-widest font-semibold shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading Memories...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5" />
                        <span>Upload {selectedFiles.length} Memories</span>
                      </>
                    )}
                  </button>

                  {!isUploading && (
                    <button
                      onClick={handleResetForMore}
                      className="w-full py-2 text-xs font-label uppercase tracking-widest text-[#7a4d5d] hover:text-rose-600 transition cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional Guest Gallery */}
        {event.gallery_enabled && (
          <GuestGallery
            eventId={event.id}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[#e08aa3]/10 text-center text-xs text-[#b592a0] font-body mt-10">
        <p>{weddingConfig.couple.bride} &amp; {weddingConfig.couple.groom} Wedding Memories • With Love</p>
      </footer>
    </div>
  );
};

export default GuestMemoriesPage;
