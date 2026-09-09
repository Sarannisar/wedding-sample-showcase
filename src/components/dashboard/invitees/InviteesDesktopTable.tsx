import React from 'react';
import { Invitee, InviteeEvent, RsvpStatus } from '@/lib/types';
import { LatestEventsSummary } from '@/lib/supabase';
import { formatTimeAgo, formatRelativeTime } from '@/lib/utils';
import { getRsvpWindow } from '@/lib/rsvpDeadline';
import { InviteeTimeline } from '../InviteeTimeline';
import { SortColumn, SortDirection } from './InviteesToolbar';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Lock,
  Eye,
  BellRing,
  Check,
  Activity,
  Save,
  X,
  Pencil,
  MessageSquareText,
  ExternalLink,
  Copy,
  Trash2,
} from 'lucide-react';

export interface InviteesDesktopTableProps {
  paginatedInvitees: Invitee[];
  selectedIds: string[];
  allFilteredSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAllFiltered: () => void;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (col: SortColumn) => void;
  eventsMap: Record<string, LatestEventsSummary>;
  activityEvents: Record<string, InviteeEvent[]>;
  expandedTrailId: string | null;
  loadingTrailId: string | null;
  onToggleActivityTrail: (id: string) => void;
  expandedNoteId: string | null;
  onToggleNote: (id: string) => void;
  editingId: string | null;
  editName: string;
  editPhone: string;
  savingId: string | null;
  onStartEditing: (invitee: Invitee) => void;
  onCancelEditing: () => void;
  onSaveEditing: (id: string) => void;
  onEditNameChange: (val: string) => void;
  onEditPhoneChange: (val: string) => void;
  onRequestRsvpChange: (invitee: Invitee, status: RsvpStatus) => void;
  copiedId: string | null;
  copiedTextId: string | null;
  onCopyLink: (invitee: Invitee) => void;
  onCopyWhatsAppText: (invitee: Invitee) => void;
  onOpenWhatsApp: (invitee: Invitee) => void;
  onRequestSingleDelete: (invitee: Invitee) => void;
}

export const InviteesDesktopTable: React.FC<InviteesDesktopTableProps> = ({
  paginatedInvitees,
  selectedIds,
  allFilteredSelected,
  onToggleSelect,
  onToggleSelectAllFiltered,
  sortColumn,
  sortDirection,
  onSort,
  eventsMap,
  activityEvents,
  expandedTrailId,
  loadingTrailId,
  onToggleActivityTrail,
  expandedNoteId,
  onToggleNote,
  editingId,
  editName,
  editPhone,
  savingId,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onEditNameChange,
  onEditPhoneChange,
  onRequestRsvpChange,
  copiedId,
  copiedTextId,
  onCopyLink,
  onCopyWhatsAppText,
  onOpenWhatsApp,
  onRequestSingleDelete,
}) => {
  return (
    <div className="hidden sm:block bg-white rounded-2xl border border-[#e08aa3]/15 shadow-sm overflow-hidden">
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#fffafc]/95 backdrop-blur z-10 border-b border-[#e08aa3]/20 shadow-xs">
            <tr className="text-[11px] font-label uppercase tracking-wider text-[#b592a0]">
              <th className="py-3.5 pl-4 pr-1 w-8">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={onToggleSelectAllFiltered}
                  className="w-4 h-4 accent-[#b05570] cursor-pointer"
                  title="Select/Deselect all filtered guests"
                />
              </th>

              {/* Sortable Name */}
              <th
                onClick={() => onSort('name')}
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
                onClick={() => onSort('rsvp')}
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
                onClick={() => onSort('guest_count')}
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

              {/* Sortable Activity Column */}
              <th
                onClick={() => onSort('activity')}
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

              {/* Sortable Reminders Column */}
              <th
                onClick={() => onSort('reminders')}
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

              {/* Sortable Sent Column */}
              <th
                onClick={() => onSort('shared_at')}
                className="py-3.5 px-4 font-semibold text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none hidden lg:table-cell"
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

              {/* Sortable Responded Column */}
              <th
                onClick={() => onSort('responded_at')}
                className="py-3.5 px-4 font-semibold text-[#4a3038] cursor-pointer hover:text-[#b05570] transition select-none hidden sm:table-cell"
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

              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedInvitees.map((invitee) => {
              const isSelected = selectedIds.includes(invitee.id);
              const isTrailOpen = expandedTrailId === invitee.id;

              return (
                <React.Fragment key={invitee.id}>
                  <tr
                    id={`invitee-row-${invitee.id}`}
                    className={`hover:bg-[#fffafc]/80 transition-colors ${
                      isSelected ? 'bg-[#fedae3]/30' : ''
                    } ${isTrailOpen ? 'bg-[#fffafc]/90' : ''}`}
                  >
                    <td className="py-3.5 pl-4 pr-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(invitee.id)}
                        className="w-4 h-4 accent-[#b05570] cursor-pointer rounded"
                      />
                    </td>

                    {/* Guest Name & Inline Editing */}
                    <td className="py-3.5 px-4">
                      {editingId === invitee.id ? (
                        <div className="space-y-1.5 py-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => onEditNameChange(e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border border-[#e08aa3] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#e08aa3]"
                            placeholder="Guest name"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => onEditPhoneChange(e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg border border-[#e08aa3] text-xs font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#e08aa3]"
                            placeholder="Phone (+94...)"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-display font-bold text-sm text-[#4a3038] hover:text-[#b05570] transition-colors">
                            {invitee.name}
                          </div>
                          {invitee.phone ? (
                            <div className="font-mono text-xs text-gray-500">
                              {invitee.phone}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic">No phone</div>
                          )}

                          {/* Notes/Dietary Accordion snippet */}
                          {invitee.notes && (
                            <div className="mt-1">
                              <button
                                onClick={() => onToggleNote(invitee.id)}
                                className="inline-flex items-center gap-1 text-[11px] text-[#b05570] hover:underline cursor-pointer font-medium"
                                title="Click to view full notes"
                              >
                                <span>Note:</span>
                                <span className="italic max-w-[180px] truncate">
                                  {invitee.notes}
                                </span>
                              </button>
                              {expandedNoteId === invitee.id && (
                                <div className="mt-1 p-2 rounded-lg bg-[#fffafc] border border-[#f2b8c6]/30 text-xs text-[#704655] italic whitespace-pre-wrap animate-in fade-in">
                                  "{invitee.notes}"
                                </div>
                              )}
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
                          onChange={(e) => onRequestRsvpChange(invitee, e.target.value as RsvpStatus)}
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

                    {/* Activity Column */}
                    <td className="py-3.5 px-4 text-xs font-body">
                      <button
                        onClick={() => onToggleActivityTrail(invitee.id)}
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

                    {/* Reminders Column */}
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
                          onClick={() => onToggleActivityTrail(invitee.id)}
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
                              onClick={() => onSaveEditing(invitee.id)}
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
                              onClick={onCancelEditing}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onStartEditing(invitee)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                            title="Edit guest name or phone"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {/* WhatsApp Direct Action */}
                        <button
                          onClick={() => onOpenWhatsApp(invitee)}
                          title="Open in WhatsApp"
                          className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-bold font-label px-1">WA</span>
                        </button>

                        {/* Copy WhatsApp Text */}
                        <button
                          onClick={() => onCopyWhatsAppText(invitee)}
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
                          onClick={() => onCopyLink(invitee)}
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
                        <button
                          onClick={() => onRequestSingleDelete(invitee)}
                          title="Delete invitee"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Activity Timeline Row */}
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
  );
};
