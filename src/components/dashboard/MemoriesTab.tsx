import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Video,
  HardDrive,
  Users,
  Calendar,
  ShieldAlert,
  Sliders,
  QrCode,
  Tv,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  X,
  Play,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { WeddingEvent, MemoryUpload, MemoriesStats, MemoriesFilter } from '@/lib/memoriesTypes';
import {
  fetchAllMemoriesForHost,
  computeMemoriesStats,
  updateMemoryUpload,
  bulkUpdateMemories,
  permanentlyDeleteMemory,
  permanentlyDeleteMemoriesBulk,
  createMemoryUploadRecord,
  updateWeddingEvent,
  formatBytes,
  resolveMediaUrl,
} from '@/lib/memoriesService';
import { formatRelativeTime } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { MemoriesSettingsModal } from './MemoriesSettingsModal';
import { MemoriesQrModal } from './MemoriesQrModal';
import { MemoriesDownloadAllModal } from './MemoriesDownloadAllModal';

interface MemoriesTabProps {
  event: WeddingEvent;
  onEventUpdated: (updated: WeddingEvent) => void;
}

export const MemoriesTab: React.FC<MemoriesTabProps> = ({ event, onEventUpdated }) => {
  const [uploads, setUploads] = useState<MemoryUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MemoriesFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDownloadAllModal, setShowDownloadAllModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<MemoryUpload | null>(null);

  const loadMemories = useCallback(async (background = false) => {
    if (!background) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await fetchAllMemoriesForHost(event.id);
      setUploads(data);
    } catch (err) {
      console.error('Error fetching memories for host:', err);
      notify.error('Could not refresh memories.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [event.id]);

  useEffect(() => {
    void loadMemories();
  }, [loadMemories]);

  const stats: MemoriesStats = computeMemoriesStats(uploads);

  // Filter items
  const filteredUploads = uploads.filter((item) => {
    if (activeFilter === 'all') return !item.is_deleted;
    if (activeFilter === 'photos') return !item.is_deleted && item.media_type === 'photo';
    if (activeFilter === 'videos') return !item.is_deleted && item.media_type === 'video';
    if (activeFilter === 'pending') return !item.is_deleted && item.status === 'pending';
    if (activeFilter === 'hidden') return !item.is_deleted && !item.is_visible;
    if (activeFilter === 'deleted') return item.is_deleted;
    return true;
  });

  // Single Actions
  const handleApprove = async (item: MemoryUpload) => {
    const ok = await updateMemoryUpload(item.id, event.id, {
      status: 'ready',
      is_visible: true,
    });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: 'ready', is_visible: true } : u))
      );
      notify.success('Memory approved and published to gallery.');
    }
  };

  const handleToggleVisibility = async (item: MemoryUpload) => {
    const nextVisible = !item.is_visible;
    const ok = await updateMemoryUpload(item.id, event.id, {
      is_visible: nextVisible,
    });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, is_visible: nextVisible } : u))
      );
      notify.info(nextVisible ? 'Memory is now visible.' : 'Memory hidden from guest gallery.');
    }
  };

  // Modal confirmation for single permanent deletion
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<MemoryUpload | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Modal confirmation for bulk permanent deletion from trash
  const [showBulkPermanentDeleteModal, setShowBulkPermanentDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Confirm and execute single permanent deletion with toast undo
  const handleConfirmSinglePermanentDelete = async () => {
    if (!deleteConfirmTarget) return;
    const target = deleteConfirmTarget;
    setIsDeletingSingle(true);

    try {
      // Optimistically remove from view
      setUploads((prev) => prev.filter((u) => u.id !== target.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      setDeleteConfirmTarget(null);

      // Perform actual deletion & R2 date-stamped archive
      const res = await permanentlyDeleteMemory(
        target.id,
        event.id,
        target.storage_key,
        target.original_filename
      );

      if (res.success) {
        notify.success(`Permanently deleted "${target.original_filename}"`, {
          action: {
            label: 'Undo',
            onClick: async () => {
              // Restore record to gallery/trash
              const restored = await createMemoryUploadRecord({
                event_id: event.id,
                guest_name: target.guest_name || null,
                original_filename: target.original_filename,
                storage_key: target.storage_key,
                media_type: target.media_type,
                mime_type: target.mime_type,
                file_size: target.file_size,
                status: target.status,
                is_visible: target.is_visible,
                is_deleted: target.is_deleted,
                width: target.width,
                height: target.height,
                duration: target.duration,
                uploaded_at: target.uploaded_at,
              });
              setUploads((prev) => [restored, ...prev]);
              notify.success(`Restored "${target.original_filename}"`);
            },
          },
          duration: 5000,
        });
      } else {
        // Rollback on failure
        setUploads((prev) => [target, ...prev]);
        notify.error(res.error || 'Failed to delete memory.');
      }
    } catch (err: any) {
      setUploads((prev) => [target, ...prev]);
      notify.error(err.message || 'Error executing permanent delete.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Confirm and execute bulk permanent deletion from trash with toast undo
  const handleConfirmBulkPermanentDelete = async () => {
    const targets = uploads.filter((u) => selectedIds.has(u.id));
    if (targets.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const targetIds = new Set(targets.map((t) => t.id));
      // Optimistically remove from state
      setUploads((prev) => prev.filter((u) => !targetIds.has(u.id)));
      setSelectedIds(new Set());
      setShowBulkPermanentDeleteModal(false);

      const itemsPayload = targets.map((t) => ({
        uploadId: t.id,
        storageKey: t.storage_key,
        originalFilename: t.original_filename,
      }));

      const res = await permanentlyDeleteMemoriesBulk(event.id, itemsPayload);

      if (res.success) {
        notify.success(`Permanently deleted ${targets.length} memories`, {
          action: {
            label: 'Undo',
            onClick: async () => {
              const restoredItems: MemoryUpload[] = [];
              for (const target of targets) {
                const rec = await createMemoryUploadRecord({
                  event_id: event.id,
                  guest_name: target.guest_name || null,
                  original_filename: target.original_filename,
                  storage_key: target.storage_key,
                  media_type: target.media_type,
                  mime_type: target.mime_type,
                  file_size: target.file_size,
                  status: target.status,
                  is_visible: target.is_visible,
                  is_deleted: target.is_deleted,
                  width: target.width,
                  height: target.height,
                  duration: target.duration,
                  uploaded_at: target.uploaded_at,
                });
                restoredItems.push(rec);
              }
              setUploads((prev) => [...restoredItems, ...prev]);
              notify.success(`Restored ${targets.length} memories`);
            },
          },
          duration: 5000,
        });
      } else {
        setUploads((prev) => [...targets, ...prev]);
        notify.error(res.error || 'Failed to permanently bulk delete memories.');
      }
    } catch (err: any) {
      setUploads((prev) => [...targets, ...prev]);
      notify.error(err.message || 'Error executing bulk permanent delete.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Move to trash (Soft Delete)
  const handleDelete = async (item: MemoryUpload) => {
    const ok = await updateMemoryUpload(item.id, event.id, {
      is_deleted: true,
      is_visible: false,
    });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, is_deleted: true, is_visible: false } : u))
      );
      notify.info('Memory moved to trash. You can restore or permanently delete it anytime.');
    }
  };

  // Restore from trash
  const handleRestore = async (item: MemoryUpload) => {
    const ok = await updateMemoryUpload(item.id, event.id, {
      is_deleted: false,
      is_visible: true,
    });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, is_deleted: false, is_visible: true } : u))
      );
      notify.success('Memory restored to gallery.');
    }
  };

  // Bulk Actions
  const handleSelectAll = () => {
    if (selectedIds.size === filteredUploads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUploads.map((u) => u.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    const ok = await bulkUpdateMemories(ids, event.id, { status: 'ready', is_visible: true });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, status: 'ready', is_visible: true } : u))
      );
      setSelectedIds(new Set());
      notify.success(`Approved ${ids.length} memories.`);
    }
  };

  const handleBulkHide = async () => {
    const ids = Array.from(selectedIds);
    const ok = await bulkUpdateMemories(ids, event.id, { is_visible: false });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, is_visible: false } : u))
      );
      setSelectedIds(new Set());
      notify.info(`Hidden ${ids.length} memories.`);
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    const ok = await bulkUpdateMemories(ids, event.id, { is_deleted: false, is_visible: true });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, is_deleted: false, is_visible: true } : u))
      );
      setSelectedIds(new Set());
      notify.success(`Restored ${ids.length} memories.`);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const ok = await bulkUpdateMemories(ids, event.id, { is_deleted: true, is_visible: false });
    if (ok) {
      setUploads((prev) =>
        prev.map((u) => (selectedIds.has(u.id) ? { ...u, is_deleted: true, is_visible: false } : u))
      );
      setSelectedIds(new Set());
      notify.info(`Moved ${ids.length} memories to trash.`);
    }
  };

  const handleToggleLiveDisplay = async () => {
    const nextState = event.live_display_enabled === false ? true : false;
    const res = await updateWeddingEvent(event.id, { live_display_enabled: nextState });
    if (res.success && res.event) {
      onEventUpdated(res.event);
      notify.success(nextState ? 'Live TV Display activated.' : 'Live TV Display paused.');
    }
  };

  const getMediaUrl = (item: MemoryUpload, download = false) => resolveMediaUrl(item, download);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Modals */}
      {showSettingsModal && (
        <MemoriesSettingsModal
          event={event}
          onClose={() => setShowSettingsModal(false)}
          onSaved={(up) => {
            onEventUpdated(up);
          }}
        />
      )}

      {showQrModal && (
        <MemoriesQrModal
          event={event}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {showDownloadAllModal && (
        <MemoriesDownloadAllModal
          event={event}
          onClose={() => setShowDownloadAllModal(false)}
        />
      )}

      {/* Top Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#e08aa3]/25 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#4a3038]">
              Wedding Memories Hub
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fff2f6] text-[#b05570] text-[10px] font-label uppercase tracking-widest font-semibold border border-[#e08aa3]/30">
              {event.slug}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7a4d5d] mt-0.5">
            Collect, moderate, and download candid guest photos &amp; videos
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e08aa3]/30 bg-[#fffafc] hover:bg-[#fff2f6] text-[#4a3038] text-xs font-semibold transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-[#e08aa3]" />
            <span>Settings</span>
          </button>

          {/* QR Code */}
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e08aa3]/30 bg-[#fffafc] hover:bg-[#fff2f6] text-[#4a3038] text-xs font-semibold transition cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#e08aa3]" />
            <span>QR &amp; Sign</span>
          </button>

          {/* Live Display Link & Toggle */}
          <div className="flex items-center rounded-xl border border-[#e08aa3]/30 bg-[#fffafc] overflow-hidden">
            <a
              href={`/memories/${event.slug}/live`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#fff2f6] text-[#4a3038] text-xs font-semibold transition cursor-pointer"
              title="Open Live Display in new tab"
            >
              <Tv className="w-4 h-4 text-[#e08aa3]" />
              <span>Live Display</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  event.live_display_enabled !== false ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
                title={event.live_display_enabled !== false ? 'Live Display Active' : 'Live Display Paused'}
              />
            </a>
            <button
              onClick={handleToggleLiveDisplay}
              className={`px-2 py-2 border-l border-[#e08aa3]/20 text-[10px] font-label uppercase font-bold tracking-wider transition cursor-pointer hover:bg-[#fff2f6] ${
                event.live_display_enabled !== false ? 'text-emerald-700' : 'text-gray-500'
              }`}
              title="Toggle Live Display On/Off"
            >
              {event.live_display_enabled !== false ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Download All */}
          <button
            onClick={() => setShowDownloadAllModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#e08aa3] to-[#b05570] hover:from-[#d17e92] hover:to-[#9c4b63] text-white text-xs font-semibold shadow-sm active:scale-95 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download All</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => void loadMemories(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#e08aa3]/30 bg-[#fffafc] hover:bg-[#fff2f6] text-[#4a3038] transition cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Photos */}
        <div className="p-4 rounded-2xl bg-white border border-[#e08aa3]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#b05570] mb-2">
            <span className="text-[10px] font-label uppercase tracking-wider font-semibold">Photos</span>
            <Camera className="w-4 h-4" />
          </div>
          <p className="font-display text-2xl font-bold text-[#4a3038]">{stats.totalPhotos}</p>
        </div>

        {/* Total Videos */}
        <div className="p-4 rounded-2xl bg-white border border-[#e08aa3]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#b05570] mb-2">
            <span className="text-[10px] font-label uppercase tracking-wider font-semibold">Videos</span>
            <Video className="w-4 h-4" />
          </div>
          <p className="font-display text-2xl font-bold text-[#4a3038]">{stats.totalVideos}</p>
        </div>

        {/* Total Storage */}
        <div className="p-4 rounded-2xl bg-white border border-[#e08aa3]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#b05570] mb-2">
            <span className="text-[10px] font-label uppercase tracking-wider font-semibold">Storage</span>
            <HardDrive className="w-4 h-4" />
          </div>
          <p className="font-display text-xl font-bold text-[#4a3038]">
            {formatBytes(stats.totalStorageBytes)}
          </p>
        </div>

        {/* Contributors */}
        <div className="p-4 rounded-2xl bg-white border border-[#e08aa3]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#b05570] mb-2">
            <span className="text-[10px] font-label uppercase tracking-wider font-semibold">Guests</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="font-display text-2xl font-bold text-[#4a3038]">{stats.uniqueContributors}</p>
        </div>

        {/* Uploads Today */}
        <div className="p-4 rounded-2xl bg-white border border-[#e08aa3]/20 shadow-sm">
          <div className="flex items-center justify-between text-[#b05570] mb-2">
            <span className="text-[10px] font-label uppercase tracking-wider font-semibold">Today</span>
            <Calendar className="w-4 h-4" />
          </div>
          <p className="font-display text-2xl font-bold text-[#4a3038]">{stats.uploadsToday}</p>
        </div>

        {/* Pending Moderation */}
        <div className={`p-4 rounded-2xl border shadow-sm transition-all ${
          stats.pendingModeration > 0
            ? 'bg-amber-50 border-amber-300'
            : 'bg-white border-[#e08aa3]/20'
        }`}>
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-[10px] font-label uppercase tracking-wider font-semibold">Pending</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <p className={`font-display text-2xl font-bold ${
            stats.pendingModeration > 0 ? 'text-amber-800' : 'text-[#4a3038]'
          }`}>
            {stats.pendingModeration}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e08aa3]/20 pb-3">
        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'photos', 'videos', 'pending', 'hidden', 'deleted'] as MemoriesFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition cursor-pointer capitalize ${
                activeFilter === f
                  ? 'bg-[#e08aa3] text-white shadow-sm'
                  : 'text-[#7a4d5d] hover:bg-[#fff2f6]'
              }`}
            >
              {f}
              {f === 'pending' && stats.pendingModeration > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px]">
                  {stats.pendingModeration}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk Actions (When Items Selected) */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-[#fff2f6] px-3 py-1.5 rounded-2xl border border-[#e08aa3]/30">
            <span className="text-xs font-semibold text-[#b05570]">
              {selectedIds.size} selected
            </span>
            {activeFilter === 'deleted' ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBulkRestore}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Selected</span>
                </button>
                <button
                  onClick={() => setShowBulkPermanentDeleteModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Permanently Delete</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleBulkApprove}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition cursor-pointer"
                >
                  Approve
                </button>
                <button
                  onClick={handleBulkHide}
                  className="px-2.5 py-1 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-[11px] font-semibold transition cursor-pointer"
                >
                  Hide
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition cursor-pointer"
                >
                  Move to Trash
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Select All Checkbox */}
      {filteredUploads.length > 0 && (
        <div className="flex items-center justify-between text-xs text-[#7a4d5d]">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 hover:text-[#4a3038] cursor-pointer"
          >
            {selectedIds.size === filteredUploads.length ? (
              <CheckSquare className="w-4 h-4 text-[#e08aa3]" />
            ) : (
              <Square className="w-4 h-4 text-gray-400" />
            )}
            <span>Select All in View ({filteredUploads.length})</span>
          </button>
        </div>
      )}

      {/* Media Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white border border-[#e08aa3]/20" />
          ))}
        </div>
      ) : filteredUploads.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white/70 border border-[#e08aa3]/20 text-center">
          <Camera className="w-12 h-12 text-[#e08aa3] mx-auto mb-3 opacity-50" />
          <p className="font-display text-lg font-bold text-[#4a3038]">
            No memories match this filter
          </p>
          <p className="text-xs text-[#7a4d5d] mt-1">
            Guests can upload memories via the QR code or link: <code>/memories/{event.slug}</code>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredUploads.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`group rounded-2xl bg-white border overflow-hidden transition-all shadow-sm hover:shadow-card-hover flex flex-col justify-between ${
                  isSelected ? 'border-[#e08aa3] ring-2 ring-[#e08aa3]/40' : 'border-[#e08aa3]/20'
                }`}
              >
                {/* Media Preview Box */}
                <div
                  className="aspect-square relative bg-gray-900 cursor-pointer overflow-hidden"
                  onClick={() => setPreviewItem(item)}
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
                    <div className="w-full h-full flex flex-col items-center justify-center text-white p-4">
                      <Play className="w-10 h-10 text-[#f7c1d0] group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-[10px] font-label uppercase tracking-widest text-[#f7c1d0]">
                        Play Video
                      </span>
                    </div>
                  )}

                  {/* Selection Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(item.id);
                    }}
                    className="absolute top-2.5 left-2.5 p-1 rounded-lg bg-black/60 hover:bg-black text-white transition cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#e08aa3]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {item.is_deleted ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-label uppercase font-semibold">
                        Deleted
                      </span>
                    ) : item.status === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-label uppercase font-semibold">
                        Pending
                      </span>
                    ) : !item.is_visible ? (
                      <span className="px-2 py-0.5 rounded-md bg-gray-700 text-white text-[9px] font-label uppercase font-semibold">
                        Hidden
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-label uppercase font-semibold">
                        Live
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="p-3 bg-white">
                  <p className="text-xs font-bold text-[#4a3038] truncate" title={item.original_filename}>
                    {item.guest_name ? `From: ${item.guest_name}` : item.original_filename}
                  </p>
                  <p className="text-[11px] text-[#7a4d5d] truncate">
                    {formatBytes(item.file_size)} • {formatRelativeTime(item.uploaded_at)}
                  </p>

                  {/* Buttons Row */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#e08aa3]/10 text-gray-500">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(item)}
                        className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Approve to Gallery"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleVisibility(item)}
                      className="p-1.5 hover:text-[#4a3038] hover:bg-[#fff2f6] rounded-lg transition cursor-pointer"
                      title={item.is_visible ? 'Hide from Guest Gallery' : 'Publish to Guest Gallery'}
                    >
                      {item.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                    </button>

                    <a
                      href={getMediaUrl(item, true)}
                      download={item.original_filename}
                      className="p-1.5 hover:text-[#4a3038] hover:bg-[#fff2f6] rounded-lg transition cursor-pointer"
                      title="Download Original"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    {item.is_deleted ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRestore(item)}
                          className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="Restore to Gallery"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTarget(item)}
                          className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Permanently Delete (Archives to R2)"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Host Lightbox Preview */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 animate-fade-in">
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
            <div>
              <p className="font-semibold text-sm truncate">
                {previewItem.original_filename}
              </p>
              <p className="text-[11px] text-white/60">
                {previewItem.guest_name ? `Guest: ${previewItem.guest_name} • ` : ''}
                {formatBytes(previewItem.file_size)} • {formatRelativeTime(previewItem.uploaded_at)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getMediaUrl(previewItem, true)}
                download={previewItem.original_filename}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 min-h-0">
            {previewItem.media_type === 'photo' ? (
              <img
                src={getMediaUrl(previewItem)}
                alt={previewItem.original_filename}
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            ) : (
              <video
                src={getMediaUrl(previewItem)}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl bg-black"
              />
            )}
          </div>
        </div>
      )}
      {/* Single Permanent Delete Confirmation Modal (Matching Invite Deletion Modal Style) */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-200 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setDeleteConfirmTarget(null)}
              disabled={isDeletingSingle}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 mt-2 shadow-inner">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#4a3038]">
              Permanently Delete Memory?
            </h3>

            <p className="font-body text-xs sm:text-sm text-[#704655] mt-2 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-rose-700 font-bold">
                "{deleteConfirmTarget.original_filename}"
              </strong>
              ? Original media is safely archived in Cloudflare R2.
            </p>

            {/* Memory Summary Card */}
            <div className="w-full bg-[#fffafc] border border-rose-100 rounded-2xl p-3.5 my-4 text-left text-xs space-y-1.5 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">From Guest:</span>
                <span className="font-semibold text-gray-700">
                  {deleteConfirmTarget.guest_name || 'Anonymous Guest'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">File Size:</span>
                <span className="font-mono text-gray-700 font-semibold">
                  {formatBytes(deleteConfirmTarget.file_size)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Archived To:</span>
                <span className="font-mono text-gray-500 text-[10px] truncate max-w-[200px]">
                  archive/{event.id}/YYYY-MM-DD/...
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#b592a0]">
              You will have 5 seconds to undo after confirming.
            </p>

            <div className="flex gap-2 w-full mt-4">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={isDeletingSingle}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSinglePermanentDelete}
                disabled={isDeletingSingle}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-label text-xs uppercase tracking-wider font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingSingle ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isDeletingSingle ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Permanent Delete Confirmation Modal (Matching Invite Bulk Delete Style) */}
      {showBulkPermanentDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-200 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBulkPermanentDeleteModal(false)}
              disabled={isBulkDeleting}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 mt-2 shadow-inner">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#4a3038]">
              Delete {selectedIds.size} Selected Memories?
            </h3>

            <p className="font-body text-xs sm:text-sm text-[#704655] mt-2 leading-relaxed">
              Are you sure you want to permanently delete these{' '}
              <strong className="text-rose-700 font-semibold">
                {selectedIds.size} memories
              </strong>{' '}
              from trash? Original files will be archived in Cloudflare R2 with date &amp; time stamps. You will have 5 seconds to undo.
            </p>

            {/* Selected Memories Preview List */}
            <div className="w-full max-h-36 overflow-y-auto bg-[#fffafc] border border-rose-100 rounded-2xl p-3 my-4 text-left text-xs space-y-1.5 shadow-xs">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block">
                Selected for Permanent Deletion:
              </span>
              {uploads
                .filter((u) => selectedIds.has(u.id))
                .slice(0, 8)
                .map((u) => (
                  <div key={u.id} className="text-gray-700 flex justify-between items-center">
                    <span className="font-medium truncate max-w-[220px]">
                      • {u.original_filename}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {formatBytes(u.file_size)}
                    </span>
                  </div>
                ))}
              {selectedIds.size > 8 && (
                <p className="text-[10px] text-gray-400 italic pt-1">
                  + {selectedIds.size - 8} more items
                </p>
              )}
            </div>

            <p className="text-[11px] text-[#b592a0]">
              You will have 5 seconds to undo this action.
            </p>

            <div className="flex gap-2 w-full mt-4">
              <button
                onClick={() => setShowBulkPermanentDeleteModal(false)}
                disabled={isBulkDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkPermanentDelete}
                disabled={isBulkDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-label text-xs uppercase tracking-wider font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBulkDeleting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isBulkDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
