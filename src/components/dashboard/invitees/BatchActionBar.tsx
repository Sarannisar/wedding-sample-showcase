import React from 'react';
import { Invitee } from '@/lib/types';
import { Trash2, Check, BellRing, Send, X } from 'lucide-react';

export interface BatchActionBarProps {
  selectedIds: string[];
  totalFiltered: number;
  onDeselectAll: () => void;
  onToggleSelectAllFiltered: () => void;
  onRequestBulkDelete: () => void;
  onBulkMarkSent: () => void;
  onStartReminders: () => void;
  onStartQueue: () => void;
  queue?: Invitee[] | null;
  queueIndex?: number;
  onCancelQueue?: () => void;
  onSendQueueCurrentAndAdvance?: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedIds,
  totalFiltered,
  onDeselectAll,
  onToggleSelectAllFiltered,
  onRequestBulkDelete,
  onBulkMarkSent,
  onStartReminders,
  onStartQueue,
  queue = null,
  queueIndex = 0,
  onCancelQueue,
  onSendQueueCurrentAndAdvance,
}) => {
  return (
    <>
      {/* Bulk actions bar (Sticky on mobile) */}
      {selectedIds.length > 0 && (
        <div className="bg-[#fff6f9] rounded-2xl p-3 px-4 border border-[#e08aa3]/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl sm:shadow-xs fixed bottom-4 left-3 right-3 z-40 sm:static sm:z-auto animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b05570] animate-pulse" />
            <span className="text-xs font-label uppercase tracking-wider text-[#b05570] font-semibold">
              {selectedIds.length} guest{selectedIds.length !== 1 ? 's' : ''} selected
              {totalFiltered > selectedIds.length && (
                <button
                  onClick={onToggleSelectAllFiltered}
                  className="ml-2 underline text-xs normal-case font-body text-[#b05570] hover:text-[#4a3038] cursor-pointer"
                >
                  (Select all {totalFiltered} filtered)
                </button>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={onDeselectAll}
              className="px-3 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold text-gray-500 hover:bg-white cursor-pointer"
            >
              Deselect
            </button>
            <button
              onClick={onRequestBulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Delete selected invitees"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
            <button
              onClick={onBulkMarkSent}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e08aa3]/40 text-[#b05570] hover:bg-white text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Mark selected as sent"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Sent</span>
            </button>
            <button
              onClick={onStartReminders}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              title="Remind selected guests"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>Remind ({selectedIds.length})</span>
            </button>
            <button
              onClick={onStartQueue}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-label uppercase tracking-wider font-semibold hover:bg-[#128C7E] transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp Queue ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Queue Progression Panel */}
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
              onClick={onCancelQueue}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer"
              title="Cancel queue"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={onSendQueueCurrentAndAdvance}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-label uppercase tracking-wider font-semibold hover:bg-[#128C7E] transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{queueIndex + 1 >= queue.length ? 'Open & Finish' : 'Open & Next'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
