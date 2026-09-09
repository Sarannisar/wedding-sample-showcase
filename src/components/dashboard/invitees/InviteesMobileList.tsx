import React from 'react';
import { Invitee, InviteeEvent } from '@/lib/types';
import { LatestEventsSummary } from '@/lib/supabase';
import { formatRelativeTime } from '@/lib/utils';
import { InviteeTimeline } from '../InviteeTimeline';
import {
  Eye,
  BellRing,
  Send,
  Copy,
  Check,
  Pencil,
  Trash2,
  Activity,
} from 'lucide-react';

export interface InviteesMobileListProps {
  paginatedInvitees: Invitee[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  eventsMap: Record<string, LatestEventsSummary>;
  activityEvents: Record<string, InviteeEvent[]>;
  expandedTrailId: string | null;
  loadingTrailId: string | null;
  onToggleActivityTrail: (id: string) => void;
  editingId: string | null;
  editName: string;
  editPhone: string;
  savingId: string | null;
  onStartEditing: (invitee: Invitee) => void;
  onCancelEditing: () => void;
  onSaveEditing: (id: string) => void;
  onEditNameChange: (val: string) => void;
  onEditPhoneChange: (val: string) => void;
  copiedId: string | null;
  onCopyLink: (invitee: Invitee) => void;
  onOpenWhatsApp: (invitee: Invitee) => void;
  onRequestSingleDelete: (invitee: Invitee) => void;
}

export const InviteesMobileList: React.FC<InviteesMobileListProps> = ({
  paginatedInvitees,
  selectedIds,
  onToggleSelect,
  eventsMap,
  activityEvents,
  expandedTrailId,
  loadingTrailId,
  onToggleActivityTrail,
  editingId,
  editName,
  editPhone,
  savingId,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onEditNameChange,
  onEditPhoneChange,
  copiedId,
  onCopyLink,
  onOpenWhatsApp,
  onRequestSingleDelete,
}) => {
  return (
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
                  onChange={() => onToggleSelect(invitee.id)}
                  className="w-5 h-5 accent-[#b05570] cursor-pointer rounded shrink-0"
                />
                {editingId === invitee.id ? (
                  <div className="space-y-1.5 flex-1 pr-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => onEditNameChange(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-[#e08aa3] text-sm font-medium text-[#4a3038]"
                      placeholder="Guest Name"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => onEditPhoneChange(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg border border-[#e08aa3] text-xs font-mono text-gray-700"
                      placeholder="Phone (+94...)"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onSaveEditing(invitee.id)}
                        disabled={savingId === invitee.id}
                        className="px-3 py-1 rounded-lg bg-[#b05570] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {savingId === invitee.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={onCancelEditing}
                        className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold cursor-pointer"
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
                onClick={() => onToggleActivityTrail(invitee.id)}
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

            {/* Line 4: Action row with >=44px touch targets */}
            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100">
              {/* WhatsApp */}
              <button
                onClick={() => onOpenWhatsApp(invitee)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#25D366] text-white hover:bg-[#128C7E] transition cursor-pointer shadow-xs"
                title="Send WhatsApp invitation"
              >
                <Send className="w-4 h-4" />
              </button>

              {/* Copy Link */}
              <button
                onClick={() => onCopyLink(invitee)}
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
                onClick={() => onStartEditing(invitee)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[#e08aa3]/30 text-[#b05570] hover:bg-[#fff5f8] transition cursor-pointer"
                title="Edit guest name or phone"
              >
                <Pencil className="w-4 h-4" />
              </button>

              {/* Delete */}
              <button
                onClick={() => onRequestSingleDelete(invitee)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Delete guest"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Activity Toggle */}
              <button
                onClick={() => onToggleActivityTrail(invitee.id)}
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

            {/* Inline Timeline Drawer inside mobile card */}
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
  );
};
