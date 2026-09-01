import React, { useState, useDeferredValue, useEffect } from 'react';
import { Invitee, InviteeEvent, RsvpStatus } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { formatTimeAgo } from '@/lib/utils';
import { exportInviteesToCsv } from '@/lib/csvHelper';
import { fetchInviteeEvents } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import {
  Search,
  ExternalLink,
  Copy,
  Trash2,
  Check,
  Download,
  Send,
  X,
  Pencil,
  Save,
  MessageSquareText,
  AlertCircle,
  Users,
  Lock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  RotateCcw,
} from 'lucide-react';

interface AllInviteesTabProps {
  invitees: Invitee[];
  targetInviteeId?: string | null;
  onClearTargetInviteeId?: () => void;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onRestore?: (invitee: Invitee) => Promise<void>;
  onBulkRestore?: (invitees: Invitee[]) => Promise<void>;
  onMarkShared: (id: string) => Promise<void>;
  onBulkMarkShared: (ids: string[]) => Promise<void>;
  onUpdateInvitee: (
    id: string,
    updates: Partial<Pick<Invitee, 'name' | 'phone' | 'notes' | 'rsvp' | 'guest_count' | 'responded_at'>>
  ) => Promise<void>;
}

type SortColumn = 'name' | 'rsvp' | 'guest_count' | 'shared_at' | 'responded_at' | 'created_at';
type SortDirection = 'asc' | 'desc';
type ChipFilter = 'all' | 'attending' | 'declined' | 'pending' | 'notsent';

export const AllInviteesTab: React.FC<AllInviteesTabProps> = ({
  invitees,
  targetInviteeId,
  onClearTargetInviteeId,
  onDelete,
  onBulkDelete,
  onRestore,
  onBulkRestore,
  onMarkShared,
  onBulkMarkShared,
  onUpdateInvitee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [chipFilter, setChipFilter] = useState<ChipFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [queue, setQueue] = useState<Invitee[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Activity trail state
  const [expandedTrailId, setExpandedTrailId] = useState<string | null>(null);
  const [activityEvents, setActivityEvents] = useState<Record<string, InviteeEvent[]>>({});
  const [loadingTrailId, setLoadingTrailId] = useState<string | null>(null);

  // Notes expanded state for mobile/desktop
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Auto-select and smooth scroll to target invitee from duplicate detection
  useEffect(() => {
    if (targetInviteeId) {
      setSelectedIds((prev) =>
        prev.includes(targetInviteeId) ? prev : [targetInviteeId, ...prev]
      );
      setSearchQuery('');
      setChipFilter('all');
      const timer = setTimeout(() => {
        const rowElement = document.getElementById(`invitee-row-${targetInviteeId}`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        onClearTargetInviteeId?.();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [targetInviteeId, onClearTargetInviteeId]);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // RSVP status change confirmation modal state
  const [rsvpConfirmTarget, setRsvpConfirmTarget] = useState<{
    invitee: Invitee;
    newStatus: RsvpStatus;
    guestCount: number;
  } | null>(null);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);

  // Dynamic live chip counts
  const counts = {
    all: invitees.length,
    attending: invitees.filter((i) => i.rsvp === 'attending').length,
    declined: invitees.filter((i) => i.rsvp === 'declined').length,
    pending: invitees.filter((i) => i.rsvp === 'pending').length,
    notsent: invitees.filter((i) => !i.shared_at).length,
  };

  // Filtered invitees
  const filteredInvitees = invitees.filter((invitee) => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/[\s\-\(\)\+\.]/g, '');

    const matchesName = invitee.name.toLowerCase().includes(q);
    const matchesSlug = invitee.slug.toLowerCase().includes(q);
    const rawPhone = invitee.phone ? invitee.phone.toLowerCase() : '';
    const cleanPhone = rawPhone.replace(/[\s\-\(\)\+\.]/g, '');
    const matchesPhone =
      Boolean(rawPhone && rawPhone.includes(q)) ||
      Boolean(cleanQ.length > 0 && cleanPhone.includes(cleanQ));

    const matchesSearch = !q || matchesName || matchesSlug || matchesPhone;

    let matchesChip = true;
    if (chipFilter === 'attending') matchesChip = invitee.rsvp === 'attending';
    else if (chipFilter === 'declined') matchesChip = invitee.rsvp === 'declined';
    else if (chipFilter === 'pending') matchesChip = invitee.rsvp === 'pending';
    else if (chipFilter === 'notsent') matchesChip = !invitee.shared_at;

    return matchesSearch && matchesChip;
  });

  // Sorted invitees
  const sortedInvitees = [...filteredInvitees].sort((a, b) => {
    let comparison = 0;
    switch (sortColumn) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'rsvp':
        comparison = a.rsvp.localeCompare(b.rsvp);
        break;
      case 'guest_count':
        comparison = (a.guest_count || 0) - (b.guest_count || 0);
        break;
      case 'shared_at':
        comparison = (a.shared_at || '').localeCompare(b.shared_at || '');
        break;
      case 'responded_at':
        comparison = (a.responded_at || '').localeCompare(b.responded_at || '');
        break;
      case 'created_at':
      default:
        comparison = (a.created_at || '').localeCompare(b.created_at || '');
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination calculation
  const totalItems = sortedInvitees.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === -1 ? 0 : (validCurrentPage - 1) * pageSize;
  const endIndex = pageSize === -1 ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const paginatedInvitees = sortedInvitees.slice(startIndex, endIndex);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getInviteUrl = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/invite/${slug}`;
  };

  const getWhatsAppMessage = (invitee: Invitee) => {
    const url = getInviteUrl(invitee.slug);
    return weddingConfig.whatsapp.messageTemplate
      .replace(/GUEST_NAME/g, invitee.name)
      .replace(/GUEST_LINK/g, url);
  };

  const handleCopyLink = (invitee: Invitee) => {
    const url = getInviteUrl(invitee.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(invitee.id);
    notify.success(`Copied invitation link for ${invitee.name}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyWhatsAppText = (invitee: Invitee) => {
    const message = getWhatsAppMessage(invitee);
    navigator.clipboard.writeText(message);
    setCopiedTextId(invitee.id);
    notify.success(`Copied WhatsApp message for ${invitee.name}`);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  const openWhatsApp = (invitee: Invitee) => {
    const message = getWhatsAppMessage(invitee);
    const phoneParam = invitee.phone ? invitee.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    void onMarkShared(invitee.id);
  };

  const handleDelete = async (id: string) => {
    const targetInvitee = invitees.find((i) => i.id === id);
    await onDelete(id);
    setSelectedIds((prev) => prev.filter((s) => s !== id));
    setDeleteConfirmId(null);

    if (targetInvitee && onRestore) {
      notify.success(`Deleted ${targetInvitee.name}`, {
        action: {
          label: 'Undo',
          onClick: () => {
            void onRestore(targetInvitee);
            notify.success(`Restored ${targetInvitee.name}`);
          },
        },
        duration: 5000,
      });
    } else {
      notify.success('Invitee deleted');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filteredInvitees.length > 0 &&
    filteredInvitees.every((i) => selectedIds.includes(i.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvitees.map((i) => i.id));
    }
  };

  const startQueue = () => {
    const list = filteredInvitees.filter((i) => selectedIds.includes(i.id));
    if (list.length === 0) return;
    setQueue(list);
    setQueueIndex(0);
  };

  const handleBulkMarkSent = async () => {
    if (selectedIds.length === 0) return;
    await onBulkMarkShared(selectedIds);
    notify.success(`Marked ${selectedIds.length} invitees as sent.`);
  };

  const sendCurrentAndAdvance = () => {
    if (!queue) return;
    openWhatsApp(queue[queueIndex]);
    if (queueIndex + 1 >= queue.length) {
      setQueue(null);
      setQueueIndex(0);
      setSelectedIds([]);
    } else {
      setQueueIndex((i) => i + 1);
    }
  };

  const startEditing = (invitee: Invitee) => {
    setEditingId(invitee.id);
    setEditName(invitee.name);
    setEditPhone(invitee.phone || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditPhone('');
  };

  const saveEditing = async (id: string) => {
    if (!editName.trim()) return;
    setSavingId(id);
    await onUpdateInvitee(id, {
      name: editName.trim(),
      phone: editPhone || null,
    });
    setSavingId(null);
    setEditingId(null);
    notify.success('Guest details updated');
  };

  const toggleActivityTrail = async (inviteeId: string) => {
    if (expandedTrailId === inviteeId) {
      setExpandedTrailId(null);
      return;
    }

    setExpandedTrailId(inviteeId);
    if (!activityEvents[inviteeId]) {
      setLoadingTrailId(inviteeId);
      try {
        const events = await fetchInviteeEvents(inviteeId);
        setActivityEvents((prev) => ({ ...prev, [inviteeId]: events }));
      } finally {
        setLoadingTrailId(null);
      }
    }
  };

  const requestRsvpChange = (invitee: Invitee, newStatus: RsvpStatus) => {
    if (invitee.notes && invitee.notes.trim()) {
      notify.info('RSVP is locked because this guest submitted custom dietary/RSVP notes.');
      return;
    }
    if (invitee.rsvp === newStatus) return;
    setRsvpConfirmTarget({
      invitee,
      newStatus,
      guestCount:
        newStatus === 'attending'
          ? invitee.guest_count && invitee.guest_count > 0
            ? invitee.guest_count
            : 1
          : 0,
    });
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const deletedTargets = invitees.filter((i) => selectedIds.includes(i.id));
    setIsBulkDeleting(true);
    try {
      if (onBulkDelete) {
        await onBulkDelete(selectedIds);
      } else {
        for (const id of selectedIds) {
          await onDelete(id);
        }
      }
      setSelectedIds([]);
      setShowBulkDeleteModal(false);

      if (onBulkRestore && deletedTargets.length > 0) {
        notify.success(`Deleted ${deletedTargets.length} invitees`, {
          action: {
            label: 'Undo',
            onClick: () => {
              void onBulkRestore(deletedTargets);
              notify.success(`Restored ${deletedTargets.length} invitees`);
            },
          },
          duration: 5000,
        });
      } else {
        notify.success(`Deleted ${deletedTargets.length} invitees`);
      }
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleConfirmRsvpChange = async () => {
    if (!rsvpConfirmTarget) return;
    setIsUpdatingRsvp(true);
    try {
      await onUpdateInvitee(rsvpConfirmTarget.invitee.id, {
        rsvp: rsvpConfirmTarget.newStatus,
        guest_count:
          rsvpConfirmTarget.newStatus === 'attending'
            ? rsvpConfirmTarget.guestCount
            : 0,
        responded_at:
          rsvpConfirmTarget.newStatus === 'pending'
            ? null
            : rsvpConfirmTarget.invitee.responded_at || new Date().toISOString(),
      });
      notify.success(`Updated RSVP status for ${rsvpConfirmTarget.invitee.name}`);
      setRsvpConfirmTarget(null);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setChipFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#e08aa3]/15 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone (+94...), or slug..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3] bg-[#fffafc]/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Export CSV Button */}
        <button
          onClick={() => {
            exportInviteesToCsv(filteredInvitees);
            notify.success(`Exported ${filteredInvitees.length} guests to CSV`);
          }}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#e08aa3]/30 text-[#b05570] hover:bg-[#e08aa3]/10 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV ({filteredInvitees.length})</span>
        </button>
      </div>

      {/* Filter Chips Row with Live Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setChipFilter('all');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'all'
              ? 'bg-[#e08aa3] text-white shadow-xs'
              : 'bg-white border border-[#e08aa3]/20 text-gray-600 hover:bg-[#fff2f6]'
          }`}
        >
          <span>All</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'all' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => {
            setChipFilter('attending');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'attending'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <span>Attending</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'attending' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {counts.attending}
          </span>
        </button>

        <button
          onClick={() => {
            setChipFilter('declined');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'declined'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          <span>Declined</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'declined' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {counts.declined}
          </span>
        </button>

        <button
          onClick={() => {
            setChipFilter('pending');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'pending'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          <span>Pending</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => {
            setChipFilter('notsent');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'notsent'
              ? 'bg-[#128C7E] text-white shadow-xs'
              : 'bg-white border border-[#128C7E]/30 text-[#128C7E] hover:bg-[#128C7E]/10'
          }`}
        >
          <span>Not Sent</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'notsent' ? 'bg-white/25 text-white' : 'bg-[#128C7E]/15 text-[#128C7E]'
            }`}
          >
            {counts.notsent}
          </span>
        </button>

        {(searchQuery || chipFilter !== 'all') && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#fff6f9] rounded-2xl p-3 px-4 border border-[#e08aa3]/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b05570] animate-pulse" />
            <span className="text-xs font-label uppercase tracking-wider text-[#b05570] font-semibold">
              {selectedIds.length} guest{selectedIds.length !== 1 ? 's' : ''} selected
              {filteredInvitees.length > selectedIds.length && (
                <button
                  onClick={toggleSelectAllFiltered}
                  className="ml-2 underline text-xs normal-case font-body text-[#b05570] hover:text-[#4a3038] cursor-pointer"
                >
                  (Select all {filteredInvitees.length} filtered)
                </button>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold text-gray-500 hover:bg-white cursor-pointer"
            >
              Deselect
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Delete selected invitees"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
            <button
              onClick={handleBulkMarkSent}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e08aa3]/40 text-[#b05570] hover:bg-white text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Mark selected as sent"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Sent</span>
            </button>
            <button
              onClick={startQueue}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-label uppercase tracking-wider font-semibold hover:bg-[#128C7E] transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp Queue ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Queue panel */}
      {queue && (
        <div className="bg-white rounded-2xl p-4 border border-[#25D366]/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="text-[11px] font-label uppercase tracking-wider text-[#b592a0] font-semibold">
              Sending {queueIndex + 1} of {queue.length}
            </p>
            <p className="font-display text-lg font-semibold text-[#4a3038]">
              {queue[queueIndex].name}
            </p>
            <p className="text-xs text-gray-500 font-body">
              {queue[queueIndex].phone || 'No number — WhatsApp recipient picker will open'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setQueue(null);
                setQueueIndex(0);
              }}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer"
              title="Cancel queue"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={sendCurrentAndAdvance}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-label uppercase tracking-wider font-semibold hover:bg-[#128C7E] transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{queueIndex + 1 >= queue.length ? 'Open & Finish' : 'Open & Next'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State when no items match */}
      {filteredInvitees.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-[#e08aa3]/15 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#fff2f6] text-[#e08aa3] flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="font-display text-lg font-bold text-[#4a3038] mb-1">
            No Guests Match Your Filters
          </h4>
          <p className="font-body text-xs text-[#b592a0] max-w-sm mx-auto mb-4">
            Try adjusting your search keywords or switching filter tabs to find who you're looking for.
          </p>
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e08aa3] text-white hover:bg-[#b05570] transition text-xs font-label uppercase tracking-wider font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Card View (visible on < md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedInvitees.map((invitee) => {
              const isSelected = selectedIds.includes(invitee.id);
              const isTrailOpen = expandedTrailId === invitee.id;

              return (
                <div
                  key={invitee.id}
                  id={`invitee-card-${invitee.id}`}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                    isSelected
                      ? 'border-[#b05570] bg-[#fedae3]/40 ring-1 ring-[#b05570]'
                      : 'border-[#e08aa3]/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(invitee.id)}
                        className="w-4.5 h-4.5 accent-[#b05570] cursor-pointer rounded"
                      />
                      <div>
                        <h4 className="font-display text-sm font-bold text-[#4a3038]">
                          {invitee.name}
                        </h4>
                        {invitee.phone && (
                          <span className="text-xs font-body text-[#b592a0] block">
                            {invitee.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] font-label uppercase tracking-wider font-bold rounded-full px-2 py-0.5 border ${
                          invitee.rsvp === 'attending'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : invitee.rsvp === 'declined'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {invitee.rsvp === 'attending'
                          ? `Attending (${invitee.guest_count || 1})`
                          : invitee.rsvp}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Dietary */}
                  {invitee.notes && (
                    <div className="my-2 p-2 rounded-lg bg-[#fffafc] border border-[#f2b8c6]/30 text-xs font-body text-[#704655] italic">
                      "{invitee.notes}"
                    </div>
                  )}

                  {/* Meta Details Row */}
                  <div className="flex items-center justify-between text-[11px] text-[#b592a0] font-body pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span>
                        Sent:{' '}
                        {invitee.shared_at ? (
                          <span className="text-[#128C7E] font-medium">{formatTimeAgo(invitee.shared_at)}</span>
                        ) : (
                          'No'
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        Reply:{' '}
                        {invitee.responded_at ? (
                          <span className="text-[#4a3038] font-medium">{formatTimeAgo(invitee.responded_at)}</span>
                        ) : (
                          'None'
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleActivityTrail(invitee.id)}
                      className="text-[#b05570] hover:underline font-label uppercase text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Activity className="w-3 h-3" />
                      <span>Activity</span>
                    </button>
                  </div>

                  {/* Mobile Activity Trail */}
                  {isTrailOpen && (
                    <div className="mt-3 p-3 bg-[#fffafc] rounded-xl border border-[#e08aa3]/20 text-xs">
                      <div className="font-label uppercase tracking-wider text-[10px] font-bold text-[#b05570] mb-2 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>Activity History</span>
                      </div>
                      {loadingTrailId === invitee.id ? (
                        <div className="py-2 text-center text-gray-400">Loading events...</div>
                      ) : (
                        <div className="space-y-1.5 font-body">
                          <div className="flex items-center justify-between text-gray-600">
                            <span>Link Created</span>
                            <span className="text-gray-400">{formatTimeAgo(invitee.created_at)}</span>
                          </div>
                          {invitee.shared_at && (
                            <div className="flex items-center justify-between text-[#128C7E]">
                              <span>WhatsApp Link Sent</span>
                              <span>{formatTimeAgo(invitee.shared_at)}</span>
                            </div>
                          )}
                          {invitee.responded_at && (
                            <div className="flex items-center justify-between text-emerald-700 font-medium">
                              <span>RSVP Submitted ({invitee.rsvp})</span>
                              <span>{formatTimeAgo(invitee.responded_at)}</span>
                            </div>
                          )}
                          {activityEvents[invitee.id]?.filter(
                            (e) => !['created', 'sent', 'responded'].includes(e.type)
                          ).map((ev) => (
                            <div key={ev.id} className="flex items-center justify-between text-gray-600">
                              <span className="capitalize">{ev.type}</span>
                              <span className="text-gray-400">{formatTimeAgo(ev.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openWhatsApp(invitee)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#25D366] text-white font-label text-xs uppercase tracking-wider font-semibold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleCopyLink(invitee)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      title="Copy link"
                    >
                      {copiedId === invitee.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`/invite/${invitee.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      title="Preview invite"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(invitee.id)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (visible on >= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#e08aa3]/15 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#fffafc]/95 backdrop-blur z-10 border-b border-[#e08aa3]/20 shadow-xs">
                  <tr className="text-[11px] font-label uppercase tracking-wider text-[#b592a0]">
                    <th className="py-3.5 pl-4 pr-1 w-8">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="w-4 h-4 accent-[#b05570] cursor-pointer"
                        title="Select/Deselect all filtered guests"
                      />
                    </th>

                    {/* Sortable Name */}
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3.5 px-4 font-semibold text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Guest Name</span>
                        {sortColumn === 'name' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </th>

                    {/* Sortable RSVP */}
                    <th
                      onClick={() => handleSort('rsvp')}
                      className="py-3.5 px-4 font-semibold text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>RSVP Status</span>
                        {sortColumn === 'rsvp' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </th>

                    {/* Sortable Guest Count */}
                    <th
                      onClick={() => handleSort('guest_count')}
                      className="py-3.5 px-4 font-semibold text-center text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Guests</span>
                        {sortColumn === 'guest_count' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </th>

                    {/* Sortable Sent */}
                    <th
                      onClick={() => handleSort('shared_at')}
                      className="py-3.5 px-4 font-semibold hidden lg:table-cell text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Sent</span>
                        {sortColumn === 'shared_at' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </th>

                    {/* Sortable Responded */}
                    <th
                      onClick={() => handleSort('responded_at')}
                      className="py-3.5 px-4 font-semibold hidden sm:table-cell text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Responded</span>
                        {sortColumn === 'responded_at' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </th>

                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-sm font-body">
                  {paginatedInvitees.map((invitee, idx) => {
                    const isSelected = selectedIds.includes(invitee.id);
                    const isTrailOpen = expandedTrailId === invitee.id;
                    const isEven = idx % 2 === 0;

                    return (
                      <React.Fragment key={invitee.id}>
                        <tr
                          id={`invitee-row-${invitee.id}`}
                          className={`transition-colors duration-150 ${
                            isSelected
                              ? 'bg-[#fedae3] hover:bg-[#fdccd8] border-l-[6px] border-l-[#b05570] font-medium text-[#2d0f19]'
                              : isEven
                              ? 'bg-white hover:bg-[#fffafc]'
                              : 'bg-gray-50/40 hover:bg-[#fffafc]'
                          }`}
                        >
                          {/* Select Checkbox */}
                          <td className="py-3.5 pl-4 pr-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(invitee.id)}
                              className="w-4.5 h-4.5 accent-[#b05570] cursor-pointer rounded transition-transform active:scale-90"
                            />
                          </td>

                          {/* Guest Name & Notes */}
                          <td className="py-3.5 px-4">
                            {editingId === invitee.id ? (
                              <div className="space-y-2 min-w-[200px]">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3]"
                                  placeholder="Name"
                                />
                                <input
                                  type="text"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#e08aa3]"
                                  placeholder="Phone (+94...)"
                                />
                              </div>
                            ) : (
                              <div className="font-display font-semibold text-[#4a3038]">
                                <div className="flex items-center gap-2">
                                  <span>{invitee.name}</span>
                                  {invitee.shared_at && !invitee.responded_at && (
                                    <span
                                      className="px-1.5 py-0.2 rounded-full text-[9px] font-label font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 inline-flex items-center gap-0.5"
                                      title="Invitation link was sent to guest"
                                    >
                                      <Eye className="w-2.5 h-2.5" />
                                      Sent
                                    </span>
                                  )}
                                </div>
                                {invitee.phone && (
                                  <span className="text-xs font-body font-normal text-[#b592a0] block">
                                    {invitee.phone}
                                  </span>
                                )}
                                {invitee.notes && (
                                  <div
                                    onClick={() =>
                                      setExpandedNoteId(expandedNoteId === invitee.id ? null : invitee.id)
                                    }
                                    className="cursor-pointer group mt-1"
                                    title="Click to view full note"
                                  >
                                    <p
                                      className={`text-[11px] font-body italic text-[#a8808e] ${
                                        expandedNoteId === invitee.id
                                          ? 'bg-[#fffafc] p-2 rounded-lg border border-[#f2b8c6]/30'
                                          : 'truncate max-w-[220px]'
                                      }`}
                                    >
                                      "{invitee.notes}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* RSVP Status with Lock Protection */}
                          <td className="py-3.5 px-4">
                            {invitee.notes && invitee.notes.trim() ? (
                              <div
                                className="inline-flex items-center gap-1.5"
                                title="RSVP status locked because guest submitted dietary/custom notes."
                              >
                                <span
                                  className={`inline-flex items-center gap-1.5 text-[11px] font-label uppercase tracking-wider font-semibold rounded-full px-2.5 py-1 border cursor-not-allowed select-none shadow-xs ${
                                    invitee.rsvp === 'attending'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                      : invitee.rsvp === 'declined'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                                      : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                  }`}
                                >
                                  <Lock className="w-3 h-3 text-[#b592a0]" />
                                  {invitee.rsvp}
                                </span>
                              </div>
                            ) : (
                              <select
                                value={invitee.rsvp}
                                onChange={(e) => requestRsvpChange(invitee, e.target.value as RsvpStatus)}
                                className={`text-[11px] font-label uppercase tracking-wider font-semibold rounded-full px-2.5 py-1 border cursor-pointer transition-colors appearance-none pr-5 bg-no-repeat bg-[right_6px_center] ${
                                  invitee.rsvp === 'attending'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : invitee.rsvp === 'declined'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}
                                style={{
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                  backgroundSize: '10px 10px',
                                }}
                                title="Click to change RSVP status"
                              >
                                <option value="pending">Pending</option>
                                <option value="attending">Attending</option>
                                <option value="declined">Declined</option>
                              </select>
                            )}
                          </td>

                          {/* Guest Count */}
                          <td className="py-3.5 px-4 text-center font-display font-bold text-[#b05570]">
                            {invitee.rsvp === 'attending' ? invitee.guest_count || 1 : '—'}
                          </td>

                          {/* Sent Status */}
                          <td className="py-3.5 px-4 hidden lg:table-cell">
                            {invitee.shared_at ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-label uppercase tracking-wider font-semibold text-[#128C7E]">
                                <Check className="w-3.5 h-3.5" />
                                {formatTimeAgo(invitee.shared_at)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-label uppercase tracking-wider text-gray-400">
                                Not sent
                              </span>
                            )}
                          </td>

                          {/* Responded Date */}
                          <td className="py-3.5 px-4 hidden sm:table-cell text-xs text-gray-500">
                            {formatTimeAgo(invitee.responded_at)}
                          </td>

                          {/* Actions Column */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Activity Trail Toggle */}
                              <button
                                onClick={() => toggleActivityTrail(invitee.id)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isTrailOpen
                                    ? 'bg-[#e08aa3] text-white'
                                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                                title="View activity history"
                              >
                                <Activity className="w-4 h-4" />
                              </button>

                              {/* Edit / Save */}
                              {editingId === invitee.id ? (
                                <>
                                  <button
                                    onClick={() => saveEditing(invitee.id)}
                                    disabled={savingId === invitee.id}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Save changes"
                                  >
                                    {savingId === invitee.id ? (
                                      <span className="w-4 h-4 block animate-spin border-2 border-emerald-700/30 border-t-emerald-700 rounded-full" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => startEditing(invitee)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                                  title="Edit guest name or phone"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}

                              {/* WhatsApp Direct Action */}
                              <button
                                onClick={() => openWhatsApp(invitee)}
                                title="Open in WhatsApp"
                                className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-colors cursor-pointer"
                              >
                                <span className="text-xs font-bold font-label px-1">WA</span>
                              </button>

                              {/* Copy WhatsApp Text */}
                              <button
                                onClick={() => handleCopyWhatsAppText(invitee)}
                                title="Copy WhatsApp invitation text"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                              >
                                {copiedTextId === invitee.id ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <MessageSquareText className="w-4 h-4 text-[#128C7E]" />
                                )}
                              </button>

                              {/* View in new tab */}
                              <a
                                href={`/invite/${invitee.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open invitation in new tab"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>

                              {/* Copy Link */}
                              <button
                                onClick={() => handleCopyLink(invitee)}
                                title="Copy invitation link"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                              >
                                {copiedId === invitee.id ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>

                              {/* Delete Action */}
                              {deleteConfirmId === invitee.id ? (
                                <button
                                  onClick={() => handleDelete(invitee.id)}
                                  className="px-2 py-1 bg-rose-600 text-white rounded-lg text-xs font-label uppercase tracking-wider font-semibold hover:bg-rose-700 cursor-pointer"
                                >
                                  Confirm
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(invitee.id)}
                                  title="Delete invitee"
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Activity Timeline Row */}
                        {isTrailOpen && (
                          <tr className="bg-[#fffafc]/90 border-b border-[#e08aa3]/20">
                            <td colSpan={7} className="p-4 pl-12">
                              <div className="max-w-2xl bg-white rounded-xl p-4 border border-[#e08aa3]/25 shadow-xs">
                                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                  <div className="flex items-center gap-2 text-xs font-label uppercase tracking-wider font-bold text-[#b05570]">
                                    <Activity className="w-4 h-4" />
                                    <span>Activity Trail for {invitee.name}</span>
                                  </div>
                                  <span className="text-[11px] text-gray-400 font-body">
                                    Slug: /invite/{invitee.slug}
                                  </span>
                                </div>

                                {loadingTrailId === invitee.id ? (
                                  <div className="py-4 text-center text-xs text-gray-400 font-body">
                                    Loading activity history...
                                  </div>
                                ) : (
                                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-[#e08aa3]/20">
                                    {/* Created Event */}
                                    <div className="flex items-start gap-3 relative pl-6">
                                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 absolute left-1.5 top-1 ring-4 ring-white" />
                                      <div className="text-xs font-body flex-1 flex items-center justify-between">
                                        <span className="font-semibold text-gray-700">Guest link created</span>
                                        <span className="text-gray-400">{formatTimeAgo(invitee.created_at)}</span>
                                      </div>
                                    </div>

                                    {/* Sent Event */}
                                    {invitee.shared_at && (
                                      <div className="flex items-start gap-3 relative pl-6">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#25D366] absolute left-1.5 top-1 ring-4 ring-white" />
                                        <div className="text-xs font-body flex-1 flex items-center justify-between">
                                          <span className="font-semibold text-[#128C7E]">
                                            Invitation sent via WhatsApp
                                          </span>
                                          <span className="text-gray-400">{formatTimeAgo(invitee.shared_at)}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Responded Event */}
                                    {invitee.responded_at && (
                                      <div className="flex items-start gap-3 relative pl-6">
                                        <div
                                          className={`w-2.5 h-2.5 rounded-full absolute left-1.5 top-1 ring-4 ring-white ${
                                            invitee.rsvp === 'attending'
                                              ? 'bg-emerald-500'
                                              : 'bg-rose-500'
                                          }`}
                                        />
                                        <div className="text-xs font-body flex-1 flex items-center justify-between">
                                          <div>
                                            <span
                                              className={`font-semibold ${
                                                invitee.rsvp === 'attending'
                                                  ? 'text-emerald-700'
                                                  : 'text-rose-700'
                                              }`}
                                            >
                                              RSVP: {invitee.rsvp.toUpperCase()}
                                            </span>
                                            {invitee.rsvp === 'attending' && (
                                              <span className="text-gray-600 ml-2">
                                                ({invitee.guest_count} guest{invitee.guest_count !== 1 ? 's' : ''})
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-gray-400">{formatTimeAgo(invitee.responded_at)}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Any additional logged events */}
                                    {activityEvents[invitee.id]?.filter(
                                      (e) => !['created', 'sent', 'responded'].includes(e.type)
                                    ).map((ev) => (
                                      <div key={ev.id} className="flex items-start gap-3 relative pl-6">
                                        <div className="w-2.5 h-2.5 rounded-full bg-purple-400 absolute left-1.5 top-1 ring-4 ring-white" />
                                        <div className="text-xs font-body flex-1 flex items-center justify-between">
                                          <span className="font-semibold text-gray-700 capitalize">
                                            {ev.type}
                                          </span>
                                          <span className="text-gray-400">{formatTimeAgo(ev.created_at)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination & Summary Controls */}
          <div className="bg-white rounded-2xl p-4 border border-[#e08aa3]/15 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Rows info */}
            <div className="text-xs font-label uppercase tracking-wider text-[#b592a0] flex items-center gap-2">
              <span>
                Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems} guests
              </span>
              {filteredInvitees.length < invitees.length && (
                <span className="text-gray-400">({invitees.length} total)</span>
              )}
            </div>

            {/* Page Size Selector & Pagination */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-label">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:border-[#e08aa3]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>All</option>
                </select>
              </div>

              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validCurrentPage <= 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 text-xs font-label font-semibold text-[#4a3038]">
                    {validCurrentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* RSVP Status Change Confirmation Modal */}
      {rsvpConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e08aa3]/30 space-y-4">
            <div className="flex items-center gap-3 text-[#b05570]">
              <div className="w-10 h-10 rounded-full bg-[#fdeef3] flex items-center justify-center text-[#e08aa3]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#4a3038]">
                  Confirm RSVP Status Change
                </h3>
                <p className="font-body text-xs text-[#b592a0]">
                  Please confirm manual override
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#fffafc] border border-[#f2b8c6]/30 space-y-2 text-xs font-body text-[#4a3038]">
              <p>
                Are you sure you want to change the RSVP status for{' '}
                <strong className="text-[#b05570] font-semibold">{rsvpConfirmTarget.invitee.name}</strong> from{' '}
                <span className="uppercase font-label font-bold text-gray-600">{rsvpConfirmTarget.invitee.rsvp}</span> to{' '}
                <span
                  className={`uppercase font-label font-bold ${
                    rsvpConfirmTarget.newStatus === 'attending'
                      ? 'text-emerald-600'
                      : rsvpConfirmTarget.newStatus === 'declined'
                      ? 'text-rose-600'
                      : 'text-amber-600'
                  }`}
                >
                  {rsvpConfirmTarget.newStatus}
                </span>
                ?
              </p>

              {/* If changing to Attending, allow setting headcount */}
              {rsvpConfirmTarget.newStatus === 'attending' && (
                <div className="pt-2 border-t border-[#f2b8c6]/20 flex items-center justify-between">
                  <span className="font-label uppercase tracking-wider text-[11px] font-semibold text-[#a8808e] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#e08aa3]" />
                    Attending Headcount:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rsvpConfirmTarget.guestCount}
                      onChange={(e) =>
                        setRsvpConfirmTarget({
                          ...rsvpConfirmTarget,
                          guestCount: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-16 px-2.5 py-1 text-center font-bold text-[#b05570] rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3]"
                    />
                    <span className="text-xs text-gray-500">guests</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRsvpConfirmTarget(null)}
                disabled={isUpdatingRsvp}
                className="px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRsvpChange}
                disabled={isUpdatingRsvp}
                className="px-5 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold bg-[#e08aa3] text-white hover:bg-[#b05570] transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdatingRsvp ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirm Change</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-200 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBulkDeleteModal(false)}
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
              Delete {selectedIds.length} Selected Invitees?
            </h3>

            <p className="font-body text-xs sm:text-sm text-[#704655] mt-2 leading-relaxed">
              Are you sure you want to permanently delete these{' '}
              <strong className="text-rose-700 font-semibold">
                {selectedIds.length} invitee{selectedIds.length !== 1 ? 's' : ''}
              </strong>
              ? You will have 5 seconds to undo this action.
            </p>

            <div className="flex gap-2 w-full mt-6">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkDelete}
                disabled={isBulkDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-label text-xs uppercase tracking-wider font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBulkDeleting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isBulkDeleting ? 'Deleting...' : 'Yes, Delete All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
