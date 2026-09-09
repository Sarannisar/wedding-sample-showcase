import React, { useState, useDeferredValue, useEffect, useMemo } from 'react';
import { Invitee, InviteeEvent, RsvpStatus } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { exportInviteesToCsv } from '@/lib/csvHelper';
import { printDayOfCoordinatorSheet } from '@/lib/printList';
import { fetchInviteeEvents, fetchLatestEventsMap, LatestEventsSummary } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { getInviteUrl, getShareableInviteUrl } from '@/lib/shareLinks';
import { getRsvpWindow } from '@/lib/rsvpDeadline';
import {
  InviteesToolbar,
  ChipFilter,
  SortColumn,
  SortDirection,
} from './invitees/InviteesToolbar';
import { BatchActionBar } from './invitees/BatchActionBar';
import { InviteesDesktopTable } from './invitees/InviteesDesktopTable';
import { InviteesMobileList } from './invitees/InviteesMobileList';
import { InviteesPagination } from './invitees/InviteesPagination';
import {
  InviteesModals,
  RsvpConfirmTarget,
} from './invitees/InviteesModals';
import { Search, RotateCcw } from 'lucide-react';

export type { ChipFilter, SortColumn, SortDirection };

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
  // Search & Filter State
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

  // Selection & Queue State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [queue, setQueue] = useState<Invitee[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);

  // Modals & Operation States
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Invitee | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [rsvpConfirmTarget, setRsvpConfirmTarget] = useState<RsvpConfirmTarget | null>(null);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);

  // Events Map & Activity Trail State
  const [eventsMap, setEventsMap] = useState<Record<string, LatestEventsSummary>>({});
  const [expandedTrailId, setExpandedTrailId] = useState<string | null>(null);
  const [activityEvents, setActivityEvents] = useState<Record<string, InviteeEvent[]>>({});
  const [loadingTrailId, setLoadingTrailId] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

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

  // Reminder Queue State
  const [reminderQueue, setReminderQueue] = useState<Invitee[] | null>(null);
  const [reminderIndex, setReminderIndex] = useState(0);
  const [overrideRecentReminded, setOverrideRecentReminded] = useState(false);
  const [copiedReminderText, setCopiedReminderText] = useState(false);

  // Sorting & Pagination State
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Smooth scroll to target invitee
  useEffect(() => {
    if (targetInviteeId) {
      setSelectedIds((prev) =>
        prev.includes(targetInviteeId) ? prev : [targetInviteeId, ...prev]
      );
      setSearchQuery('');
      setChipFilter('all');
      const timer = setTimeout(() => {
        const rowElement =
          document.getElementById(`invitee-row-${targetInviteeId}`) ||
          document.getElementById(`invitee-card-${targetInviteeId}`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        onClearTargetInviteeId?.();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [targetInviteeId, onClearTargetInviteeId]);

  // Memoized Chip Counts
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

  // Filtered invitees
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

  // Sorted invitees
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

  const handleSortChange = (column: SortColumn, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  // Helper WhatsApp & Link sharing
  const buildWhatsAppMessage = (invitee: Invitee, template?: string) => {
    const url = getShareableInviteUrl(invitee.slug);
    const tmpl = template || weddingConfig.whatsapp.messageTemplate;
    return tmpl
      .replace(/GUEST_NAME/g, invitee.name)
      .replace(/GUEST_LINK/g, url);
  };

  const buildReminderMessage = (invitee: Invitee) => {
    const tmpl =
      weddingConfig.whatsapp.reminderTemplate ||
      weddingConfig.whatsapp.messageTemplate;
    return buildWhatsAppMessage(invitee, tmpl);
  };

  const openWhatsApp = (invitee: Invitee) => {
    const message = buildWhatsAppMessage(invitee);
    const phoneParam = invitee.phone ? invitee.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phoneParam
      ? `https://api.whatsapp.com/send/?phone=${phoneParam}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    void onMarkShared(invitee.id);
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

  // Reminder Queue actions
  const startReminderQueue = (selectedOnly = false) => {
    let eligible = invitees.filter((i) => i.rsvp === 'pending' && Boolean(i.shared_at));
    if (selectedOnly && selectedIds.length > 0) {
      eligible = eligible.filter((i) => selectedIds.includes(i.id));
    }
    // Guard against closed RSVP window
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
    const message = buildReminderMessage(current);
    const phoneParam = current.phone ? current.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phoneParam
      ? `https://api.whatsapp.com/send/?phone=${phoneParam}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send/?text=${encodeURIComponent(message)}`;

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

  // Selection actions
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

  // Bulk actions
  const handleBulkMarkSent = async () => {
    if (selectedIds.length === 0) return;
    await onBulkMarkShared(selectedIds);
    notify.success(`Marked ${selectedIds.length} invitees as sent.`);
  };

  const startQueue = () => {
    const list = filteredInvitees.filter((i) => selectedIds.includes(i.id));
    if (list.length === 0) return;
    setQueue(list);
    setQueueIndex(0);
  };

  const sendQueueCurrentAndAdvance = () => {
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

  // Inline editing actions
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

  // Activity trail actions
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

  // RSVP Change modal actions
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

  // Delete modal actions
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setChipFilter('all');
    setCurrentPage(1);
  };

  const handlePrintDayOfSheet = () => {
    if (filteredInvitees.length === 0) {
      notify.info('No guests match the current filters to print.');
      return;
    }
    printDayOfCoordinatorSheet(filteredInvitees, eventsMap);
    notify.success(`Opening Day-Of Reception Roster for ${filteredInvitees.length} guests...`);
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter Chips & Sort Toolbar */}
      <InviteesToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        chipFilter={chipFilter}
        onSelectChip={handleSelectChip}
        counts={counts}
        filteredCount={filteredInvitees.length}
        onStartReminderQueue={() => startReminderQueue(false)}
        onExportCsv={() => {
          exportInviteesToCsv(filteredInvitees);
          notify.success(`Exported ${filteredInvitees.length} guests to CSV`);
        }}
        onPrintDayOfSheet={handlePrintDayOfSheet}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {/* Bulk Batch Actions & Queue Progress Bar */}
      <BatchActionBar
        selectedIds={selectedIds}
        totalFiltered={filteredInvitees.length}
        onDeselectAll={() => setSelectedIds([])}
        onToggleSelectAllFiltered={toggleSelectAllFiltered}
        onRequestBulkDelete={() => setShowBulkDeleteModal(true)}
        onBulkMarkSent={handleBulkMarkSent}
        onStartReminders={() => startReminderQueue(true)}
        onStartQueue={startQueue}
        queue={queue}
        queueIndex={queueIndex}
        onCancelQueue={() => {
          setQueue(null);
          setQueueIndex(0);
        }}
        onSendQueueCurrentAndAdvance={sendQueueCurrentAndAdvance}
      />

      {/* Main List Area */}
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
          {/* Mobile Card List View */}
          <InviteesMobileList
            paginatedInvitees={paginatedInvitees}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            eventsMap={eventsMap}
            activityEvents={activityEvents}
            expandedTrailId={expandedTrailId}
            loadingTrailId={loadingTrailId}
            onToggleActivityTrail={toggleActivityTrail}
            editingId={editingId}
            editName={editName}
            editPhone={editPhone}
            savingId={savingId}
            onStartEditing={startEditing}
            onCancelEditing={cancelEditing}
            onSaveEditing={saveEditing}
            onEditNameChange={setEditName}
            onEditPhoneChange={setEditPhone}
            copiedId={copiedId}
            onCopyLink={handleCopyLink}
            onOpenWhatsApp={openWhatsApp}
            onRequestSingleDelete={setDeleteConfirmTarget}
          />

          {/* Desktop Table View */}
          <InviteesDesktopTable
            paginatedInvitees={paginatedInvitees}
            selectedIds={selectedIds}
            allFilteredSelected={allFilteredSelected}
            onToggleSelect={toggleSelect}
            onToggleSelectAllFiltered={toggleSelectAllFiltered}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            eventsMap={eventsMap}
            activityEvents={activityEvents}
            expandedTrailId={expandedTrailId}
            loadingTrailId={loadingTrailId}
            onToggleActivityTrail={toggleActivityTrail}
            expandedNoteId={expandedNoteId}
            onToggleNote={(id) => setExpandedNoteId((prev) => (prev === id ? null : id))}
            editingId={editingId}
            editName={editName}
            editPhone={editPhone}
            savingId={savingId}
            onStartEditing={startEditing}
            onCancelEditing={cancelEditing}
            onSaveEditing={saveEditing}
            onEditNameChange={setEditName}
            onEditPhoneChange={setEditPhone}
            onRequestRsvpChange={requestRsvpChange}
            copiedId={copiedId}
            copiedTextId={copiedTextId}
            onCopyLink={handleCopyLink}
            onCopyWhatsAppText={handleCopyWhatsAppText}
            onOpenWhatsApp={openWhatsApp}
            onRequestSingleDelete={setDeleteConfirmTarget}
          />

          {/* Pagination Controls */}
          <InviteesPagination
            totalItems={totalItems}
            totalInvitedCount={invitees.length}
            filteredCount={filteredInvitees.length}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            currentPage={validCurrentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Confirmation & Reminder Modals */}
      <InviteesModals
        rsvpConfirmTarget={rsvpConfirmTarget}
        isUpdatingRsvp={isUpdatingRsvp}
        onCloseRsvpModal={() => setRsvpConfirmTarget(null)}
        onConfirmRsvpChange={handleConfirmRsvpChange}
        onRsvpGuestCountChange={(guestCount) => {
          if (rsvpConfirmTarget) {
            setRsvpConfirmTarget({ ...rsvpConfirmTarget, guestCount });
          }
        }}
        deleteConfirmTarget={deleteConfirmTarget}
        isDeletingSingle={isDeletingSingle}
        onCloseDeleteModal={() => setDeleteConfirmTarget(null)}
        onConfirmSingleDelete={handleConfirmSingleDelete}
        showBulkDeleteModal={showBulkDeleteModal}
        isBulkDeleting={isBulkDeleting}
        selectedIds={selectedIds}
        allInvitees={invitees}
        onCloseBulkDeleteModal={() => setShowBulkDeleteModal(false)}
        onConfirmBulkDelete={handleExecuteBulkDelete}
        reminderQueue={reminderQueue}
        reminderIndex={reminderIndex}
        overrideRecentReminded={overrideRecentReminded}
        onSetOverrideRecentReminded={setOverrideRecentReminded}
        copiedReminderText={copiedReminderText}
        onCopyReminderMessage={(msg) => {
          navigator.clipboard.writeText(msg);
          setCopiedReminderText(true);
          setTimeout(() => setCopiedReminderText(false), 2000);
          notify.success('Copied reminder text');
        }}
        onCloseReminderModal={() => {
          setReminderQueue(null);
          setReminderIndex(0);
        }}
        onSkipReminder={skipReminderCurrent}
        onSendReminderAndAdvance={sendReminderCurrentAndAdvance}
        buildReminderMessage={buildReminderMessage}
      />
    </div>
  );
};
