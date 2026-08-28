import React, { useState, useDeferredValue } from 'react';
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
} from 'lucide-react';

interface AllInviteesTabProps {
  invitees: Invitee[];
  onDelete: (id: string) => Promise<void>;
  onMarkShared: (id: string) => Promise<void>;
  onBulkMarkShared: (ids: string[]) => Promise<void>;
  onUpdateInvitee: (
    id: string,
    updates: Partial<Pick<Invitee, 'name' | 'phone' | 'notes'>>
  ) => Promise<void>;
}

export const AllInviteesTab: React.FC<AllInviteesTabProps> = ({
  invitees,
  onDelete,
  onMarkShared,
  onBulkMarkShared,
  onUpdateInvitee,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | RsvpStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<Invitee[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const filteredInvitees = invitees.filter((invitee) => {
    const matchesSearch =
      invitee.name.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
      invitee.slug.toLowerCase().includes(deferredSearchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : invitee.rsvp === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getInviteUrl = (slug: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/invite/${slug}`;
  };

  const handleCopyLink = (invitee: Invitee) => {
    const url = getInviteUrl(invitee.slug);
    navigator.clipboard.writeText(url);
    setCopiedId(invitee.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsApp = (invitee: Invitee) => {
    const url = getInviteUrl(invitee.slug);
    const message = weddingConfig.whatsapp.messageTemplate
      .replace(/GUEST_NAME/g, invitee.name)
      .replace(/GUEST_LINK/g, url);

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
    setEditNotes(invitee.notes || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditPhone('');
    setEditNotes('');
  };

  const saveEditing = async (id: string) => {
    if (!editName.trim()) return;
    setSavingId(id);
    await onUpdateInvitee(id, {
      name: editName.trim(),
      phone: editPhone || null,
      notes: editNotes || null,
    });
    setSavingId(null);
    setEditingId(null);
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
            placeholder="Search by name or slug..."
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
                  ? 'bg-[#e08aa3] text-white'
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
          <span className="text-xs font-label uppercase tracking-wider text-[#b05570] font-semibold">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold text-gray-500 hover:bg-white cursor-pointer"
            >
              Clear
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
                filteredInvitees.map((invitee) => (
                  <tr key={invitee.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Select */}
                    <td className="py-3.5 pl-4 pr-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(invitee.id)}
                        onChange={() => toggleSelect(invitee.id)}
                        className="w-4 h-4 accent-[#e08aa3] cursor-pointer"
                      />
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4">
                      {editingId === invitee.id ? (
                        <div className="space-y-2 min-w-[180px]">
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
                            placeholder="Phone"
                          />
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#e08aa3]"
                            placeholder="Notes"
                          />
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
                            <p className="text-[11px] font-body text-[#a8808e] mt-1 max-w-[200px] truncate" title={invitee.notes}>
                              {invitee.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Slug / Link */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs font-mono text-gray-500">
                      /invite/{invitee.slug}
                    </td>

                    {/* RSVP Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-label uppercase tracking-wider font-semibold ${
                          invitee.rsvp === 'attending'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : invitee.rsvp === 'declined'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {invitee.rsvp}
                      </span>
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
                            title="Edit guest"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {/* WhatsApp Action */}
                        <button
                          onClick={() => openWhatsApp(invitee)}
                          title="Share on WhatsApp"
                          className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-bold font-label px-1">WA</span>
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
                ))
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
    </div>
  );
};
