import React from 'react';
import { Invitee, RsvpStatus } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  AlertCircle,
  Users,
  Check,
  X,
  Trash2,
  BellRing,
  Copy,
  Send,
} from 'lucide-react';

export interface RsvpConfirmTarget {
  invitee: Invitee;
  newStatus: RsvpStatus;
  guestCount: number;
}

export interface InviteesModalsProps {
  // RSVP Confirm Modal
  rsvpConfirmTarget: RsvpConfirmTarget | null;
  isUpdatingRsvp: boolean;
  onCloseRsvpModal: () => void;
  onConfirmRsvpChange: () => void;
  onRsvpGuestCountChange: (count: number) => void;

  // Single Delete Modal
  deleteConfirmTarget: Invitee | null;
  isDeletingSingle: boolean;
  onCloseDeleteModal: () => void;
  onConfirmSingleDelete: () => void;

  // Bulk Delete Modal
  showBulkDeleteModal: boolean;
  isBulkDeleting: boolean;
  selectedIds: string[];
  allInvitees: Invitee[];
  onCloseBulkDeleteModal: () => void;
  onConfirmBulkDelete: () => void;

  // Reminder Queue Modal
  reminderQueue: Invitee[] | null;
  reminderIndex: number;
  overrideRecentReminded: boolean;
  onSetOverrideRecentReminded: (val: boolean) => void;
  copiedReminderText: boolean;
  onCopyReminderMessage: (msg: string) => void;
  onCloseReminderModal: () => void;
  onSkipReminder: () => void;
  onSendReminderAndAdvance: () => void;
  buildReminderMessage: (invitee: Invitee) => string;
}

export const InviteesModals: React.FC<InviteesModalsProps> = ({
  rsvpConfirmTarget,
  isUpdatingRsvp,
  onCloseRsvpModal,
  onConfirmRsvpChange,
  onRsvpGuestCountChange,
  deleteConfirmTarget,
  isDeletingSingle,
  onCloseDeleteModal,
  onConfirmSingleDelete,
  showBulkDeleteModal,
  isBulkDeleting,
  selectedIds,
  allInvitees,
  onCloseBulkDeleteModal,
  onConfirmBulkDelete,
  reminderQueue,
  reminderIndex,
  overrideRecentReminded,
  onSetOverrideRecentReminded,
  copiedReminderText,
  onCopyReminderMessage,
  onCloseReminderModal,
  onSkipReminder,
  onSendReminderAndAdvance,
  buildReminderMessage,
}) => {
  return (
    <>
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
                        onRsvpGuestCountChange(Math.max(1, parseInt(e.target.value) || 1))
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
                onClick={onCloseRsvpModal}
                disabled={isUpdatingRsvp}
                className="px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmRsvpChange}
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
              onClick={onCloseDeleteModal}
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
                onClick={onCloseDeleteModal}
                disabled={isDeletingSingle}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmSingleDelete}
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
              onClick={onCloseBulkDeleteModal}
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
              {allInvitees
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
                onClick={onCloseBulkDeleteModal}
                disabled={isBulkDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmBulkDelete}
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

      {/* WhatsApp Reminder Queue Modal */}
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
                onClick={onCloseReminderModal}
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
              const msg = buildReminderMessage(current);

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
                          onChange={(e) => onSetOverrideRecentReminded(e.target.checked)}
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
                      onClick={() => onCopyReminderMessage(msg)}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-label uppercase tracking-wider font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedReminderText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy text</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onSkipReminder}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-label uppercase tracking-wider font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                      >
                        Skip
                      </button>

                      <button
                        onClick={onSendReminderAndAdvance}
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
    </>
  );
};
