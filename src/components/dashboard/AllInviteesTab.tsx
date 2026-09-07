import React, { useState, useDeferredValue, useEffect, useMemo } from 'react';
import { Invitee, InviteeEvent, RsvpStatus } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { formatTimeAgo, formatRelativeTime } from '@/lib/utils';
import { exportInviteesToCsv } from '@/lib/csvHelper';
import { fetchInviteeEvents, fetchLatestEventsMap, LatestEventsSummary } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { getInviteUrl, getShareableInviteUrl } from '@/lib/shareLinks';
import { getRsvpWindow } from '@/lib/rsvpDeadline';
import { InviteeTimeline } from './InviteeTimeline';
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
  BellRing,
} from 'lucide-react';

export type ChipFilter =
  | 'all'
  | 'attending'
  | 'declined'
  | 'pending'
  | 'opened_unresponded'
  | 'notsent'
  | 'ignored';

export interface AllInviteesTabProps {
  invitees: Invitee[];
  targetInviteeId?: string | null;
  onClearTargetInviteeId?: () => void;
  statusFilter?: ChipFilter;
  onStatusFilterChange?: (filter: ChipFilter) => void;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onRestore?: (invitee: Invitee) => Promise<void>;
  onBulkRestore?: (invitees: Invitee[]) => Promise<void>;
  onMarkShared: (id: string) => Promise<void>;
  onBulkMarkShared: (ids: string[]) => Promise<void>;
  onRemindInvitee?: (id: string) => Promise<boolean>;
  onBulkRemind?: (ids: string[]) => Promise<boolean>;
  openReminderQueue?: boolean;
  onResetReminderQueue?: () => void;
  onUpdateInvitee: (
    id: string,
    updates: Partial<Pick<Invitee, 'name' | 'phone' | 'notes' | 'rsvp' | 'guest_count' | 'responded_at'>>
  ) => Promise<void>;
}

export type SortColumn =
  | 'name'
  | 'rsvp'
  | 'guest_count'
  | 'shared_at'
  | 'responded_at'
  | 'created_at'
  | 'activity'
  | 'reminders';
export type SortDirection = 'asc' | 'desc';

export const AllInviteesTab: React.FC<AllInviteesTabProps> = ({
  invitees,
  targetInviteeId,
  onClearTargetInviteeId,
  statusFilter,
  onStatusFilterChange,
  onDelete,
  onBulkDelete,
  onRestore,
  onBulkRestore,
  onMarkShared,
  onBulkMarkShared,
  onRemindInvitee,
  onBulkRemind: _onBulkRemind,
  openReminderQueue,
  onResetReminderQueue,
  onUpdateInvitee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [chipFilter, setChipFilter] = useState<ChipFilter>(statusFilter || 'all');

  useEffect(() => {
    if (statusFilter) {
      setChipFilter(statusFilter);
    }
  }, [statusFilter]);

  const handleSelectChip = (filter: ChipFilter) => {
    setChipFilter(filter);
    onStatusFilterChange?.(filter);
    setCurrentPage(1);
  };
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Invitee | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [queue, setQueue] = useState<Invitee[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);

  // Events map for aggregate activity (Step 6)
  const [eventsMap, setEventsMap] = useState<Record<string, LatestEventsSummary>>({});

  useEffect(() => {
    let mounted = true;
    const loadEventsMap = async () => {
      try {
        const data = await fetchLatestEventsMap();
        if (mounted) setEventsMap(data);
      } catch (err) {
        console.error('Failed to load events map:', err);
      }
    };
    loadEventsMap();
    return () => {
      mounted = false;
    };
  }, [invitees]);

  // Reminder queue state (Item 4)
  const [reminderQueue, setReminderQueue] = useState<Invitee[] | null>(null);
  const [reminderIndex, setReminderIndex] = useState(0);
  const [overrideRecentReminded, setOverrideRecentReminded] = useState(false);
  const [copiedReminderText, setCopiedReminderText] = useState(false);

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

  // Dynamic live chip counts (single-pass memoized reduction)
  const counts = useMemo(() => {
    let attending = 0;
    let declined = 0;
    let pending = 0;
    let opened_unresponded = 0;
    let notsent = 0;
    let ignored = 0;
    const now = Date.now();
    for (const i of invitees) {
      if (i.rsvp === 'attending') attending++;
      else if (i.rsvp === 'declined') declined++;
      else if (i.rsvp === 'pending') {
        pending++;
        if (i.opened_at || eventsMap[i.id]?.lastOpenedAt) opened_unresponded++;
      }
      if (!i.shared_at) {
        notsent++;
      } else {
        const isOpened = Boolean(i.opened_at || eventsMap[i.id]?.lastOpenedAt);
        if (!isOpened && now - new Date(i.shared_at).getTime() > 48 * 3600 * 1000) {
          ignored++;
        }
      }
    }
    return {
      all: invitees.length,
      attending,
      declined,
      pending,
      opened_unresponded,
      notsent,
      ignored,
    };
  }, [invitees, eventsMap]);

  // Filtered invitees (memoized on invitees, deferred search query, and active chip filter)
  const filteredInvitees = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/[\s\-\(\)\+\.]/g, '');

    return invitees.filter((invitee) => {
      let matchesSearch = true;
      if (q) {
        const matchesName = invitee.name.toLowerCase().includes(q);
        const matchesSlug = invitee.slug.toLowerCase().includes(q);
        const rawPhone = invitee.phone ? invitee.phone.toLowerCase() : '';
        const cleanPhone = rawPhone.replace(/[\s\-\(\)\+\.]/g, '');
        const matchesPhone =
          Boolean(rawPhone && rawPhone.includes(q)) ||
          Boolean(cleanQ.length > 0 && cleanPhone.includes(cleanQ));
        matchesSearch = matchesName || matchesSlug || matchesPhone;
      }

      let matchesChip = true;
      if (chipFilter === 'attending') matchesChip = invitee.rsvp === 'attending';
      else if (chipFilter === 'declined') matchesChip = invitee.rsvp === 'declined';
      else if (chipFilter === 'pending') matchesChip = invitee.rsvp === 'pending';
      else if (chipFilter === 'opened_unresponded')
        matchesChip =
          invitee.rsvp === 'pending' &&
          Boolean(invitee.opened_at || eventsMap[invitee.id]?.lastOpenedAt);
      else if (chipFilter === 'notsent') matchesChip = !invitee.shared_at;
      else if (chipFilter === 'ignored') {
        const isSent = Boolean(invitee.shared_at);
        const isOpened = Boolean(invitee.opened_at || eventsMap[invitee.id]?.lastOpenedAt);
        matchesChip =
          isSent &&
          !isOpened &&
          Boolean(invitee.shared_at) &&
          Date.now() - new Date(invitee.shared_at!).getTime() > 48 * 3600 * 1000;
      }

      return matchesSearch && matchesChip;
    });
  }, [invitees, deferredSearchQuery, chipFilter, eventsMap]);

  // Sorted invitees (memoized on filtered list, column, and direction)
  const sortedInvitees = useMemo(() => {
    return [...filteredInvitees].sort((a, b) => {
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
        case 'activity': {
          const aTime = eventsMap[a.id]?.lastOpenedAt || a.opened_at || '';
          const bTime = eventsMap[b.id]?.lastOpenedAt || b.opened_at || '';
          comparison = aTime.localeCompare(bTime);
          break;
        }
        case 'reminders': {
          const aCount = a.reminder_count || 0;
          const bCount = b.reminder_count || 0;
          comparison = aCount - bCount;
          if (comparison === 0) {
            const aTime = a.reminded_at || '';
            const bTime = b.reminded_at || '';
            comparison = aTime.localeCompare(bTime);
          }
          break;
        }
        case 'created_at':
        default:
          comparison = (a.created_at || '').localeCompare(b.created_at || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvitees, sortColumn, sortDirection, eventsMap]);

  // Pagination calculation
  const totalItems = sortedInvitees.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === -1 ? 0 : (validCurrentPage - 1) * pageSize;
  const endIndex = pageSize === -1 ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const paginatedInvitees = useMemo(() => {
    return sortedInvitees.slice(startIndex, endIndex);
  }, [sortedInvitees, startIndex, endIndex]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const buildWhatsAppMessage = (invitee: Invitee, template?: string) => {
    const url = getShareableInviteUrl(invitee.slug);
    const tmpl = template || weddingConfig.whatsapp.messageTemplate;
    return tmpl
      .replace(/GUEST_NAME/g, invitee.name)
      .replace(/GUEST_LINK/g, url);
  };

  const startReminderQueue = (selectedOnly = false) => {
    let eligible = invitees.filter((i) => i.rsvp === 'pending' && Boolean(i.shared_at));
    if (selectedOnly && selectedIds.length > 0) {
      eligible = eligible.filter((i) => selectedIds.includes(i.id));
    }
    // Guard against closed RSVP window (Item 3)
    eligible = eligible.filter((i) => {
      const win = getRsvpWindow(i.first_opened_at ?? i.created_at);
      return win.isOpen;
    });

    if (eligible.length === 0) {
      notify.info('No pending guests with sent links are currently eligible for reminders.');
      return;
    }

    setReminderQueue(eligible);
    setReminderIndex(0);
    setOverrideRecentReminded(false);
    setCopiedReminderText(false);
  };

  useEffect(() => {
    if (openReminderQueue) {
      startReminderQueue();
      onResetReminderQueue?.();
    }
  }, [openReminderQueue]);

  const sendReminderCurrentAndAdvance = async () => {
    if (!reminderQueue) return;
    const current = reminderQueue[reminderIndex];
    const tmpl =
      weddingConfig.whatsapp.reminderTemplate || weddingConfig.whatsapp.messageTemplate;
    const message = buildWhatsAppMessage(current, tmpl);
    const phoneParam = current.phone ? current.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (onRemindInvitee) {
      await onRemindInvitee(current.id);
    }

    if (reminderIndex + 1 >= reminderQueue.length) {
      setReminderQueue(null);
      setReminderIndex(0);
      notify.success('Completed reminder queue!');
    } else {
      setReminderIndex((i) => i + 1);
      setCopiedReminderText(false);
    }
  };

  const skipReminderCurrent = () => {
    if (!reminderQueue) return;
    if (reminderIndex + 1 >= reminderQueue.length) {
      setReminderQueue(null);
      setReminderIndex(0);
      notify.info('Completed reminder queue.');
    } else {
      setReminderIndex((i) => i + 1);
      setCopiedReminderText(false);
    }
  };

  const handleCopyLink = (invitee: Invitee) => {
    const url = getInviteUrl(invitee.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(invitee.id);
    notify.success(`Copied invitation link for ${invitee.name}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyWhatsAppText = (invitee: Invitee) => {
    const message = buildWhatsAppMessage(invitee);
    navigator.clipboard.writeText(message);
    setCopiedTextId(invitee.id);
    notify.success(`Copied WhatsApp message for ${invitee.name}`);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  const openWhatsApp = (invitee: Invitee) => {
    const message = buildWhatsAppMessage(invitee);
    const phoneParam = invitee.phone ? invitee.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    void onMarkShared(invitee.id);
  };

  const requestSingleDelete = (invitee: Invitee) => {
    setDeleteConfirmTarget(invitee);
  };

  const handleConfirmSingleDelete = async () => {
    if (!deleteConfirmTarget) return;
    const target = deleteConfirmTarget;
    setIsDeletingSingle(true);
    try {
      await onDelete(target.id);
      setSelectedIds((prev) => prev.filter((s) => s !== target.id));
      setDeleteConfirmTarget(null);

      if (onRestore) {
        notify.success(`Deleted invitation for ${target.name}`, {
          action: {
            label: 'Undo',
            onClick: () => {
              void onRestore(target);
              notify.success(`Restored ${target.name}`);
            },
          },
          duration: 5000,
        });
      } else {
        notify.success(`Deleted invitation for ${target.name}`);
      }
    } catch (err) {
      console.error('Failed to delete invitee:', err);
      notify.error('Could not delete invitation.');
    } finally {
      setIsDeletingSingle(false);
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
      const targetId = rsvpConfirmTarget.invitee.id;
      setRsvpConfirmTarget(null);
      // Invalidate and refresh activity trail cache
      setActivityEvents((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      if (expandedTrailId === targetId) {
        void fetchInviteeEvents(targetId).then((events) => {
          setActivityEvents((prev) => ({ ...prev, [targetId]: events }));
        });
      }
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => startReminderQueue(false)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            title="Send WhatsApp reminder to pending guests with sent invitations"
          >
            <BellRing className="w-4 h-4 text-amber-600" />
            <span>Remind Pending</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => {
              exportInviteesToCsv(filteredInvitees);
              notify.success(`Exported ${filteredInvitees.length} guests to CSV`);
            }}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#e08aa3]/30 text-[#b05570] hover:bg-[#e08aa3]/10 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({filteredInvitees.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Row with Live Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => handleSelectChip('all')}
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
          onClick={() => handleSelectChip('attending')}
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
          onClick={() => handleSelectChip('declined')}
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
          onClick={() => handleSelectChip('pending')}
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
          onClick={() => handleSelectChip('opened_unresponded')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'opened_unresponded'
              ? 'bg-[#8a243e] text-white shadow-xs'
              : 'bg-white border border-[#e08aa3]/40 text-[#8a243e] hover:bg-[#fff0f4]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Opened (Unresponded)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'opened_unresponded'
                ? 'bg-white/25 text-white'
                : 'bg-[#fff0f4] text-[#8a243e]'
            }`}
          >
            {counts.opened_unresponded}
          </span>
        </button>

        <button
          onClick={() => handleSelectChip('notsent')}
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

        {/* Ignored Chip (Item 6) */}
        <button
          onClick={() => handleSelectChip('ignored')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'ignored'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
          }`}
          title="Sent >48h ago but never opened"
        >
          <span>Ignored</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'ignored' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {counts.ignored}
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

      {/* Mobile Sort Control (Item 8) */}
      <div className="sm:hidden flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#e08aa3]/20 shadow-xs text-xs font-body">
        <span className="text-[#7a4d5d] font-label uppercase tracking-wider text-[11px] font-semibold shrink-0">
          Sort by:
        </span>
        <select
          value={`${sortColumn}_${sortDirection}`}
          onChange={(e) => {
            const [col, dir] = e.target.value.split('_') as [SortColumn, SortDirection];
            setSortColumn(col);
            setSortDirection(dir);
            setCurrentPage(1);
          }}
          className="flex-1 bg-transparent text-[#4a3038] font-medium text-xs focus:outline-none cursor-pointer"
        >
          <option value="created_at_desc">Newest Added</option>
          <option value="created_at_asc">Oldest Added</option>
          <option value="name_asc">Name (A → Z)</option>
          <option value="name_desc">Name (Z → A)</option>
          <option value="rsvp_asc">RSVP Status</option>
          <option value="guest_count_desc">Guest Count (High → Low)</option>
          <option value="guest_count_asc">Guest Count (Low → High)</option>
          <option value="activity_desc">Activity (Recent first)</option>
          <option value="reminders_desc">Reminders (Most first)</option>
          <option value="shared_at_desc">Sent Link (Recent first)</option>
          <option value="responded_at_desc">Responded (Recent first)</option>
        </select>
      </div>

      {/* Bulk actions bar (Sticky on mobile, Item 8) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#fff6f9] rounded-2xl p-3 px-4 border border-[#e08aa3]/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl sm:shadow-xs fixed bottom-4 left-3 right-3 z-40 sm:static sm:z-auto animate-in fade-in">
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
              onClick={() => startReminderQueue(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Remind selected guests"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>Remind ({selectedIds.length})</span>
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
          {/* Mobile Stacked Card View (visible below sm, Item 8) */}
          <div className="sm:hidden space-y-3">
            {paginatedInvitees.map((invitee) => {
              const isSelected = selectedIds.includes(invitee.id);
              const isTrailOpen = expandedTrailId === invitee.id;
              const summary = eventsMap[invitee.id];

              return (
                <div
                  key={invitee.id}
                  id={`invitee-card-${invitee.id}`}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs space-y-3 ${
                    isSelected
                      ? 'border-[#b05570] bg-[#fedae3]/40 ring-1 ring-[#b05570]'
                      : 'border-[#e08aa3]/20'
                  }`}
                >
                  {/* Line 1: Checkbox + Name + RSVP Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(invitee.id)}
                        className="w-5 h-5 accent-[#b05570] cursor-pointer rounded shrink-0"
                      />
                      {editingId === invitee.id ? (
                        <div className="space-y-1.5 flex-1 pr-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-[#e08aa3] text-sm font-medium text-[#4a3038]"
                            placeholder="Guest Name"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-[#e08aa3] text-xs font-mono text-gray-700"
                            placeholder="Phone (+94...)"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => saveEditing(invitee.id)}
                              disabled={savingId === invitee.id}
                              className="px-3 py-1 rounded-lg bg-[#b05570] text-white text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="font-display font-bold text-base text-[#4a3038] truncate">
                          {invitee.name}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-label uppercase tracking-wider font-bold rounded-full px-2.5 py-1 border shrink-0 ${
                        invitee.rsvp === 'attending'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : invitee.rsvp === 'declined'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {invitee.rsvp === 'attending'
                        ? `Attending (+${invitee.guest_count || 1})`
                        : invitee.rsvp}
                    </span>
                  </div>

                  {/* Line 2: Phone + Guest Count */}
                  <div className="flex items-center justify-between text-xs text-[#7a4d5d] font-body">
                    <span>
                      {invitee.phone ? (
                        <span className="font-mono text-gray-700">{invitee.phone}</span>
                      ) : (
                        <span className="text-gray-400 italic">No phone recorded</span>
                      )}
                    </span>
                    <span className="font-medium text-[#4a3038]">
                      {invitee.guest_count || 1} guest{(invitee.guest_count || 1) > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Notes / Dietary if present */}
                  {invitee.notes && (
                    <div className="p-2.5 rounded-xl bg-[#fffafc] border border-[#f2b8c6]/30 text-xs font-body text-[#704655] italic">
                      "{invitee.notes}"
                    </div>
                  )}

                  {/* Line 3: Activity Caption & Reminders */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 font-body">
                    <button
                      onClick={() => toggleActivityTrail(invitee.id)}
                      className="text-left font-medium text-[#b05570] hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#e08aa3]" />
                      <span>
                        {summary?.lastOpenedAt || invitee.opened_at
                          ? `Opened ${formatRelativeTime(summary?.lastOpenedAt || invitee.opened_at!)} · ${summary?.openCount || 1}×`
                          : 'Never opened'}
                      </span>
                    </button>

                    {invitee.reminder_count && invitee.reminder_count > 0 ? (
                      <span className="text-[11px] text-[#b05570] font-medium flex items-center gap-1">
                        <BellRing className="w-3 h-3" />
                        <span>{invitee.reminder_count}×</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Line 4: Action row with >=44px touch targets (Item 8) */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100">
                    {/* WhatsApp */}
                    <button
                      onClick={() => openWhatsApp(invitee)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#25D366] text-white hover:bg-[#128C7E] transition cursor-pointer shadow-xs"
                      title="Send WhatsApp invitation"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={() => handleCopyLink(invitee)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                      title="Copy invitation link"
                    >
                      {copiedId === invitee.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit Details */}
                    <button
                      onClick={() => startEditing(invitee)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[#e08aa3]/30 text-[#b05570] hover:bg-[#fff5f8] transition cursor-pointer"
                      title="Edit guest name or phone"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => requestSingleDelete(invitee)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete guest"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Activity Toggle */}
                    <button
                      onClick={() => toggleActivityTrail(invitee.id)}
                      className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition cursor-pointer ${
                        isTrailOpen
                          ? 'border-[#b05570] bg-[#fff0f4] text-[#b05570]'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                      title="Toggle activity timeline"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Inline Timeline Drawer inside mobile card (Item 6) */}
                  {isTrailOpen && (
                    <div className="pt-2 border-t border-[#e08aa3]/20">
                      <div className="bg-[#fffafc] rounded-xl p-3 border border-[#e08aa3]/20">
                        <InviteeTimeline
                          invitee={invitee}
                          events={activityEvents[invitee.id] || []}
                          isLoading={loadingTrailId === invitee.id}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (visible on >= sm, Item 8) */}
          <div className="hidden sm:block bg-white rounded-2xl border border-[#e08aa3]/15 shadow-sm overflow-hidden">
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

                    {/* Sortable Activity (Item 6) */}
                    <th
                      onClick={() => handleSort('activity')}
                      className="py-3.5 px-4 font-semibold text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Activity</span>
                        {sortColumn === 'activity' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </th>

                    {/* Sortable Reminders (Item 4) */}
                    <th
                      onClick={() => handleSort('reminders')}
                      className="py-3.5 px-4 font-semibold text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none hidden lg:table-cell"
                    >
                      <div className="flex items-center gap-1">
                        <span>Reminders</span>
                        {sortColumn === 'reminders' ? (
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
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const sanitized = val.startsWith('+')
                                      ? '+' + val.substring(1).replace(/\D/g, '')
                                      : val.replace(/\D/g, '');
                                    setEditPhone(sanitized);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#e08aa3] font-mono"
                                  placeholder="Phone (e.g. 0771234567 or +971...)"
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

                          {/* Activity Column (Item 6) */}
                          <td className="py-3.5 px-4 text-xs font-body">
                            <button
                              onClick={() => toggleActivityTrail(invitee.id)}
                              className="text-left group cursor-pointer"
                              title="Click to view full activity timeline"
                            >
                              {eventsMap[invitee.id]?.lastOpenedAt || invitee.opened_at ? (
                                <span className="inline-flex items-center gap-1.5 text-[#b05570] font-medium group-hover:underline">
                                  <Eye className="w-3.5 h-3.5 text-[#e08aa3]" />
                                  <span>
                                    Opened {formatRelativeTime(eventsMap[invitee.id]?.lastOpenedAt || invitee.opened_at!)} · {eventsMap[invitee.id]?.openCount || 1}×
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[#b592a0]">
                                  Never opened
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Reminders Column (Item 4) */}
                          <td className="py-3.5 px-4 text-xs font-body hidden lg:table-cell">
                            {invitee.reminder_count && invitee.reminder_count > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fdeef3] text-[#b05570] font-semibold text-[11px]"
                                title={`Last reminded: ${invitee.reminded_at ? new Date(invitee.reminded_at).toLocaleString() : ''}`}
                              >
                                <BellRing className="w-3 h-3 text-[#b05570]" />
                                <span>{invitee.reminder_count}×</span>
                                {invitee.reminded_at && (
                                  <span className="text-[10px] text-[#7a4d5d] font-normal">
                                    ({formatRelativeTime(invitee.reminded_at)})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[#b592a0]">0</span>
                            )}
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

                              {/* Delete Action with Confirmation Modal */}
                              <button
                                onClick={() => requestSingleDelete(invitee)}
                                title="Delete invitee"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Activity Timeline Row (Item 6) */}
                        {isTrailOpen && (
                          <tr className="bg-[#fffafc]/95 border-b border-[#e08aa3]/20">
                            <td colSpan={9} className="p-4 pl-12">
                              <div className="max-w-2xl bg-white rounded-2xl p-5 border border-[#e08aa3]/25 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                  <div className="flex items-center gap-2 text-xs font-label uppercase tracking-wider font-bold text-[#b05570]">
                                    <Activity className="w-4 h-4" />
                                    <span>Activity Timeline for {invitee.name}</span>
                                  </div>
                                  {(() => {
                                    const win = getRsvpWindow(invitee.first_opened_at ?? invitee.created_at);
                                    return (
                                      <span
                                        className={`text-[11px] font-label font-medium px-2.5 py-0.5 rounded-full ${
                                          !win.isOpen
                                            ? 'bg-rose-100 text-rose-800'
                                            : win.isLate
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-[#fff0f4] text-[#b05570]'
                                        }`}
                                      >
                                        RSVP: {win.isOpen ? `Open until ${win.deadline.toLocaleDateString()}` : 'Closed'} ({win.isLate ? 'Late invite' : 'Standard'})
                                      </span>
                                    );
                                  })()}
                                </div>

                                <InviteeTimeline
                                  invitee={invitee}
                                  events={activityEvents[invitee.id] || []}
                                  isLoading={loadingTrailId === invitee.id}
                                />
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

      {/* Single Delete Confirmation Modal */}
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
              Delete Invitation?
            </h3>

            <p className="font-body text-xs sm:text-sm text-[#704655] mt-2 leading-relaxed">
              Are you sure you want to permanently delete the invitation for{' '}
              <strong className="text-rose-700 font-bold">
                {deleteConfirmTarget.name}
              </strong>
              ?
            </p>

            {/* Guest Summary Card */}
            <div className="w-full bg-[#fffafc] border border-rose-100 rounded-2xl p-3.5 my-4 text-left text-xs space-y-1.5 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Phone:</span>
                <span className="font-semibold text-gray-700 font-mono">
                  {deleteConfirmTarget.phone || 'None'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">RSVP Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-label uppercase tracking-wider font-semibold ${
                    deleteConfirmTarget.rsvp === 'attending'
                      ? 'bg-emerald-100 text-emerald-800'
                      : deleteConfirmTarget.rsvp === 'declined'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {deleteConfirmTarget.rsvp} ({deleteConfirmTarget.guest_count || 1} guest{(deleteConfirmTarget.guest_count || 1) !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Invitation Link:</span>
                <span className="font-mono text-gray-600 text-[11px] truncate max-w-[180px]">
                  /invite/{deleteConfirmTarget.slug}
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
                onClick={handleConfirmSingleDelete}
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

            {/* Selected Guests Preview List */}
            <div className="w-full max-h-36 overflow-y-auto bg-[#fffafc] border border-rose-100 rounded-2xl p-3 my-4 text-left text-xs space-y-1.5 shadow-xs">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px] block">
                Selected for Deletion:
              </span>
              {invitees
                .filter((i) => selectedIds.includes(i.id))
                .slice(0, 8)
                .map((i) => (
                  <div key={i.id} className="text-gray-700 flex justify-between items-center">
                    <span className="font-medium truncate max-w-[220px]">• {i.name}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">{i.rsvp}</span>
                  </div>
                ))}
              {selectedIds.length > 8 && (
                <p className="text-gray-400 italic text-[11px] pt-1 text-center">
                  ...and {selectedIds.length - 8} more guests
                </p>
              )}
            </div>

            <div className="flex gap-2 w-full mt-2">
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

      {/* WhatsApp Reminder Queue Modal (Item 4) */}
      {reminderQueue && reminderQueue.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#e08aa3]/30 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#4a3038]">
                    WhatsApp Reminder Queue
                  </h3>
                  <span className="text-xs font-body text-[#b592a0]">
                    Guest {reminderIndex + 1} of {reminderQueue.length}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setReminderQueue(null);
                  setReminderIndex(0);
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Guest Card */}
            {(() => {
              const current = reminderQueue[reminderIndex];
              const isRecent = Boolean(
                current.reminded_at &&
                Date.now() - new Date(current.reminded_at).getTime() < 48 * 3600 * 1000
              );
              const tmpl =
                weddingConfig.whatsapp.reminderTemplate ||
                weddingConfig.whatsapp.messageTemplate;
              const msg = buildWhatsAppMessage(current, tmpl);

              return (
                <div className="space-y-4">
                  <div className="bg-[#fffafc] rounded-2xl p-4 border border-[#e08aa3]/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-lg text-[#4a3038]">
                        {current.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-label uppercase tracking-wider font-bold bg-amber-100 text-amber-800">
                        Pending RSVP
                      </span>
                    </div>

                    <div className="text-xs text-[#7a4d5d] space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Phone:</span>
                        <span className="font-mono text-gray-800">
                          {current.phone || 'No phone recorded'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Reminders Sent:</span>
                        <span className="font-medium">
                          {current.reminder_count || 0} times
                          {current.reminded_at && ` (${formatRelativeTime(current.reminded_at)})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 48h Recent Reminder Guard */}
                  {isRecent && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Recently reminded {formatRelativeTime(current.reminded_at!)}</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer pt-1 font-body">
                        <input
                          type="checkbox"
                          checked={overrideRecentReminded}
                          onChange={(e) => setOverrideRecentReminded(e.target.checked)}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span>Send reminder anyway</span>
                      </label>
                    </div>
                  )}

                  {/* Message Preview */}
                  <div>
                    <span className="text-[11px] font-label uppercase tracking-wider text-[#7a4d5d] font-semibold block mb-1">
                      Message Copy
                    </span>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {msg}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg);
                        setCopiedReminderText(true);
                        setTimeout(() => setCopiedReminderText(false), 2000);
                        notify.success('Copied reminder text');
                      }}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-label uppercase tracking-wider font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedReminderText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy text</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={skipReminderCurrent}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-label uppercase tracking-wider font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                      >
                        Skip
                      </button>

                      <button
                        onClick={sendReminderCurrentAndAdvance}
                        disabled={isRecent && !overrideRecentReminded}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-label uppercase tracking-wider font-semibold hover:bg-[#128C7E] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                        <span>Open WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
