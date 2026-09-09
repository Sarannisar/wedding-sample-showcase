import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface InviteesPaginationProps {
  totalItems: number;
  totalInvitedCount: number;
  filteredCount: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const InviteesPagination: React.FC<InviteesPaginationProps> = ({
  totalItems,
  totalInvitedCount,
  filteredCount,
  startIndex,
  endIndex,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e08aa3]/15 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Rows info */}
      <div className="text-xs font-label uppercase tracking-wider text-[#b592a0] flex items-center gap-2">
        <span>
          Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems} guests
        </span>
        {filteredCount < totalInvitedCount && (
          <span className="text-gray-400">({totalInvitedCount} total)</span>
        )}
      </div>

      {/* Page Size Selector & Pagination */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-label">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(parseInt(e.target.value));
            }}
            className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:border-[#e08aa3] cursor-pointer"
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
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 text-xs font-label font-semibold text-[#4a3038]">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
