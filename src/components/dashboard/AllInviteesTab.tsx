import React, { useState, useDeferredValue, useEffect } from 'react';
import { Invitee, RsvpStatus } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { formatTimeAgo } from '@/lib/utils';
import { exportInviteesToCsv } from '@/lib/csvHelper';
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
} from 'lucide-react';

interface AllInviteesTabProps {
  invitees: Invitee[];
  targetInviteeId?: string | null;
  onClearTargetInviteeId?: () => void;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onMarkShared: (id: string) => Promise<void>;
  onBulkMarkShared: (ids: string[]) => Promise<void>;
  onUpdateInvitee: (
    id: string,
    updates: Partial<Pick<Invitee, 'name' | 'phone' | 'notes' | 'rsvp' | 'guest_count' | 'responded_at'>>
  ) => Promise<void>;
}

export const AllInviteesTab: React.FC<AllInviteesTabProps> = ({
  invitees,
  targetInviteeId,
  onClearTargetInviteeId,
  onDelete,
  onBulkDelete,
  onMarkShared,
  onBulkMarkShared,
  onUpdateInvitee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | RsvpStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [queue, setQueue] = useState<Invitee[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);

  // Auto-select and smooth scroll to target invitee from duplicate detection
  useEffect(() => {
    if (targetInviteeId) {
      setSelectedIds((prev) =>
        prev.includes(targetInviteeId) ? prev : [targetInviteeId, ...prev]
      );
      setSearchQuery('');
      setStatusFilter('all');
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

  // Inline editing state (Note: Guest RSVP note is strictly read-only for guests only)
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

  // Enhanced search filtering: searches name, slug, or phone numbers (raw digits & formatted)
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
    const matchesStatus =
      statusFilter === 'all' ? true : invitee.rsvp === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyWhatsAppText = (invitee: Invitee) => {
    const message = getWhatsAppMessage(invitee);
    navigator.clipboard.writeText(message);
    setCopiedTextId(invitee.id);
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
    await onDelete(id);
    setSelectedIds((prev) => prev.filter((s) => s !== id));
    setDeleteConfirmId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const allFilteredSelected =
    filteredInvitees.length > 0 &&
    filteredInvitees.every((i) => selectedIds.includes(i.id));

  const toggleSelectAll = () => {
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
  };

  const requestRsvpChange = (invitee: Invitee, newStatus: RsvpStatus) => {
    // If the guest already submitted an RSVP note, changing RSVP status from dashboard is blocked
    if (invitee.notes && invitee.notes.trim()) {
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
      setRsvpConfirmTarget(null);
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-[#e08aa3]/15 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone (+94...), or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'attending', 'declined'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-colors shrink-0 cursor-pointer ${
                statusFilter === filter
                  ? 'bg-[#e08aa3] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Export CSV */}
        <button
          onClick={() => exportInviteesToCsv(filteredInvitees)}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[#e08aa3]/30 text-[#b05570] hover:bg-[#e08aa3]/10 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#fff6f9] rounded-2xl p-3 px-4 border border-[#e08aa3]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-label uppercase tracking-wider text-[#b05570] font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e08aa3]" />
            {selectedIds.length} invitee{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold text-gray-500 hover:bg-white cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Delete selected invitees"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
            <button
              onClick={handleBulkMarkSent}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e08aa3]/40 text-[#b05570] hover:bg-white text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Mark selected as sent without opening WhatsApp"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Sent</span>
            </button>
            <button
              onClick={startQueue}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-label uppercase tracking-wider font-semibold hover:bg-[#128C7E] transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Start WhatsApp queue</span>
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
              {queue[queueIndex].phone || 'No number — chat picker will open'}
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

      {/* Invitees Table */}
      <div className="bg-white rounded-2xl border border-[#e08aa3]/15 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-label uppercase tracking-wider text-[#b592a0]">
                <th className="py-3 pl-4 pr-1 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-[#e08aa3] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold">Guest Name</th>
                <th className="py-3 px-4 font-semibold hidden md:table-cell">Slug / Link</th>
                <th className="py-3 px-4 font-semibold">RSVP Status</th>
                <th className="py-3 px-4 font-semibold text-center">Guests</th>
                <th className="py-3 px-4 font-semibold hidden lg:table-cell">Sent</th>
                <th className="py-3 px-4 font-semibold hidden sm:table-cell">Responded</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-body">
              {filteredInvitees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#b592a0] text-sm">
                    No invitees found matching your search or filter.
                  </td>
                </tr>
              ) : (
                filteredInvitees.map((invitee) => {
                  const isSelected = selectedIds.includes(invitee.id);
                  return (
                    <tr
                      key={invitee.id}
                      id={`invitee-row-${invitee.id}`}
                      className={`transition-colors duration-150 ${
                        isSelected
                          ? 'bg-[#fedae3] hover:bg-[#fdccd8] border-l-[6px] border-l-[#b05570] font-medium text-[#2d0f19]'
                          : 'hover:bg-gray-50/70 text-[#4a3038]'
                      }`}
                    >
                      {/* Select */}
                      <td className="py-3.5 pl-4 pr-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(invitee.id)}
                          className="w-4.5 h-4.5 accent-[#b05570] cursor-pointer rounded transition-transform active:scale-90"
                        />
                      </td>

                    {/* Name */}
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
                          {invitee.notes && (
                            <p className="text-[11px] font-body italic text-[#a8808e] bg-[#fffafc] p-2 rounded-lg border border-[#f2b8c6]/30">
                              Guest note (read-only): "{invitee.notes}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="font-display font-semibold text-[#4a3038]">
                          <div>{invitee.name}</div>
                          {invitee.phone && (
                            <span className="text-xs font-body font-normal text-[#b592a0]">
                              {invitee.phone}
                            </span>
                          )}
                          {invitee.notes && (
                            <p className="text-[11px] font-body italic text-[#a8808e] mt-1 max-w-[220px] truncate" title={`Guest note: ${invitee.notes}`}>
                              "{invitee.notes}"
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Slug / Link */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs font-mono text-gray-500">
                      /invite/{invitee.slug}
                    </td>

                    {/* RSVP Status with Note Lock Protection */}
                    <td className="py-3.5 px-4">
                      {invitee.notes && invitee.notes.trim() ? (
                        <div
                          className="inline-flex items-center gap-1.5"
                          title="RSVP status cannot be manually changed because this guest submitted an RSVP note."
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
                          title="Click to change RSVP status (requires confirmation)"
                        >
                          <option value="pending">Pending</option>
                          <option value="attending">Attending</option>
                          <option value="declined">Declined</option>
                        </select>
                      )}
                    </td>

                    {/* Guest Count */}
                    <td className="py-3.5 px-4 text-center font-display font-bold text-[#b05570]">
                      {invitee.rsvp === 'attending' ? invitee.guest_count : '—'}
                    </td>

                    {/* Sent / Shared */}
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

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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

                        {/* WhatsApp Action */}
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
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Row Count Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-[#b592a0] font-label uppercase tracking-wider">
          <span>Total Rows: {filteredInvitees.length}</span>
          <span>Showing all filtered guests</span>
        </div>
      </div>

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
              ? Their personalized invitation URLs will no longer be valid.
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
