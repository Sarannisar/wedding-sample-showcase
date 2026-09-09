import React from 'react';
import { Search, X, BellRing, Download, ClipboardCheck } from 'lucide-react';

export type ChipFilter =
  | 'all'
  | 'attending'
  | 'declined'
  | 'pending'
  | 'opened_unresponded'
  | 'notsent'
  | 'ignored';

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

export interface InviteesToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  chipFilter: ChipFilter;
  onSelectChip: (filter: ChipFilter) => void;
  counts: Record<ChipFilter, number>;
  filteredCount: number;
  onStartReminderQueue: () => void;
  onExportCsv: () => void;
  onPrintDayOfSheet: () => void;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSortChange: (column: SortColumn, direction: SortDirection) => void;
}

export const InviteesToolbar: React.FC<InviteesToolbarProps> = ({
  searchQuery,
  onSearchChange,
  chipFilter,
  onSelectChip,
  counts,
  filteredCount,
  onStartReminderQueue,
  onExportCsv,
  onPrintDayOfSheet,
  sortColumn,
  sortDirection,
  onSortChange,
}) => {
  return (
    <div className="space-y-3">
      {/* Search & Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#e08aa3]/15 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone (+94...), or slug..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3] bg-[#fffafc]/60"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={onStartReminderQueue}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            title="Send WhatsApp reminder to pending guests with sent invitations"
          >
            <BellRing className="w-4 h-4 text-amber-600" />
            <span>Remind Pending</span>
          </button>

          <button
            onClick={onExportCsv}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#e08aa3]/30 text-[#b05570] hover:bg-[#e08aa3]/10 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            title="Export filtered guests to CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({filteredCount})</span>
          </button>

          <button
            onClick={onPrintDayOfSheet}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-label uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            title="Print coordinator & usher check-in sheet with checkboxes & history"
          >
            <ClipboardCheck className="w-4 h-4 text-purple-600" />
            <span>Day-Of Sheet</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Row with Live Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelectChip('all')}
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
          onClick={() => onSelectChip('attending')}
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
          onClick={() => onSelectChip('declined')}
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
          onClick={() => onSelectChip('pending')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
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
          onClick={() => onSelectChip('opened_unresponded')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'opened_unresponded'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white border border-sky-200 text-sky-800 hover:bg-sky-50'
          }`}
          title="Guests who opened the link but haven't submitted an RSVP"
        >
          <span>Opened (Unresponded)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'opened_unresponded'
                ? 'bg-white/25 text-white'
                : 'bg-sky-100 text-sky-800'
            }`}
          >
            {counts.opened_unresponded}
          </span>
        </button>

        <button
          onClick={() => onSelectChip('notsent')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'notsent'
              ? 'bg-gray-700 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>Not Sent</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'notsent' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {counts.notsent}
          </span>
        </button>

        <button
          onClick={() => onSelectChip('ignored')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer shrink-0 ${
            chipFilter === 'ignored'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white border border-purple-200 text-purple-800 hover:bg-purple-50'
          }`}
          title="Invitations sent over 48 hours ago with 0 opens"
        >
          <span>Ignored (48h+)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              chipFilter === 'ignored' ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-800'
            }`}
          >
            {counts.ignored}
          </span>
        </button>
      </div>

      {/* Mobile Sorting Dropdown */}
      <div className="sm:hidden flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#e08aa3]/20 shadow-xs text-xs font-body">
        <span className="text-[#7a4d5d] font-label uppercase tracking-wider text-[11px] font-semibold shrink-0">
          Sort by:
        </span>
        <select
          value={`${sortColumn}_${sortDirection}`}
          onChange={(e) => {
            const [col, dir] = e.target.value.split('_') as [SortColumn, SortDirection];
            onSortChange(col, dir);
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
    </div>
  );
};
