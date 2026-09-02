import React, { useState } from 'react';
import { Invitee } from '@/lib/types';
import { StatCard } from './StatCard';
import { ResponseBar } from './ResponseBar';
import { GuestNotesSection } from './GuestNotesSection';
import { formatTimeAgo } from '@/lib/utils';
import { printGuestList } from '@/lib/printList';
import { exportSeatingCsv } from '@/lib/csvHelper';
import { notify } from '@/lib/notify';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  UserPlus,
  Send,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Eye,
} from 'lucide-react';

interface OverviewTabProps {
  invitees: Invitee[];
  onNavigateToAdd?: () => void;
  onFilterClick?: (status: 'all' | 'attending' | 'declined' | 'pending' | 'opened_unresponded' | 'notsent') => void;
  onGuestClick?: (guestId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  invitees,
  onNavigateToAdd,
  onFilterClick,
  onGuestClick,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<'attending' | 'declined' | 'pending' | null>(null);

  const totalInvited = invitees.length;
  const attendingList = invitees.filter((i) => i.rsvp === 'attending');
  const attendingCount = attendingList.length;
  const totalGuestCount = attendingList.reduce((acc, curr) => acc + (curr.guest_count || 1), 0);
  const declinedCount = invitees.filter((i) => i.rsvp === 'declined').length;
  const pendingCount = invitees.filter((i) => i.rsvp === 'pending').length;
  const notSentCount = invitees.filter((i) => !i.shared_at).length;
  const sentCount = totalInvited - notSentCount;

  // Task 3.2: Opened but not responded
  const openedNotRespondedCount = invitees.filter(
    (i) => i.rsvp === 'pending' && Boolean(i.opened_at)
  ).length;

  const attendingPercent = totalInvited > 0 ? (attendingCount / totalInvited) * 100 : 0;
  const declinedPercent = totalInvited > 0 ? (declinedCount / totalInvited) * 100 : 0;
  const pendingPercent = totalInvited > 0 ? (pendingCount / totalInvited) * 100 : 0;
  const respondedCount = attendingCount + declinedCount;
  const respondedPercent = totalInvited > 0 ? (respondedCount / totalInvited) * 100 : 0;

  // Last 8 responses
  const respondedInvitees = invitees
    .filter((i) => i.rsvp !== 'pending' && Boolean(i.responded_at))
    .sort(
      (a, b) =>
        new Date(b.responded_at!).getTime() - new Date(a.responded_at!).getTime()
    )
    .slice(0, 8);

  const handlePrint = (filter: 'all' | 'attending') => {
    if (invitees.length === 0) {
      notify.info('No guests to print yet.');
      return;
    }
    printGuestList(invitees, filter);
    notify.success('Opening print layout...');
  };

  const handleExportSeating = () => {
    if (attendingCount === 0) {
      notify.info('No attending guests recorded yet for seating export.');
      return;
    }
    exportSeatingCsv(invitees);
    notify.success(`Exported seating chart with ${attendingCount} parties.`);
  };

  if (totalInvited === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-[#e08aa3]/20 shadow-card-3d text-center max-w-xl mx-auto my-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#fff2f6] flex items-center justify-center text-[#e08aa3]">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="font-display text-2xl font-bold text-[#4a3038] mb-2">No Guests Added Yet</h3>
        <p className="font-body text-sm text-[#b592a0] mb-6 leading-relaxed">
          Start by adding your wedding guest list or importing names from a CSV spreadsheet. You can then track RSVPs, monitor attendance, and share personalized links.
        </p>
        {onNavigateToAdd && (
          <button
            onClick={onNavigateToAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#e08aa3] text-white hover:bg-[#b05570] transition shadow-md font-label text-xs uppercase tracking-wider font-semibold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Add & Import Guests
          </button>
        )}
      </div>
    );
  }

  // Donut SVG circumference math (r=40 => 2 * pi * 40 ≈ 251.2)
  const circumference = 251.2;
  const attendingStroke = (attendingCount / totalInvited) * circumference;
  const declinedStroke = (declinedCount / totalInvited) * circumference;
  const pendingStroke = (pendingCount / totalInvited) * circumference;

  return (
    <div className="space-y-6">
      {/* Quick Action Bar for Print & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e08aa3]/15 shadow-sm">
        <div>
          <span className="font-display text-base font-bold text-[#4a3038] block">
            Guest Overview & Metrics
          </span>
          <span className="font-body text-xs text-[#b592a0]">
            {respondedCount} of {totalInvited} responded ({Math.round(respondedPercent)}%) • {totalGuestCount} attending headcount
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrint('all')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fff2f6] text-[#b05570] hover:bg-[#f7c1d0]/40 transition border border-[#e08aa3]/20 text-xs font-label uppercase tracking-wider font-medium cursor-pointer"
            title="Print / Save complete guest list as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print All</span>
          </button>

          <button
            onClick={() => handlePrint('attending')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200 text-xs font-label uppercase tracking-wider font-medium cursor-pointer"
            title="Print attending guests with headcount"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Attending</span>
          </button>

          <button
            onClick={handleExportSeating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#4a3038] hover:bg-gray-50 transition border border-gray-200 text-xs font-label uppercase tracking-wider font-medium cursor-pointer"
            title="Export seating list as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Seating CSV</span>
          </button>
        </div>
      </div>

      {/* Task 2.2: Primary Stat Hierarchy (3 Prominent Primary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          primary
          accentBorderClass="border-emerald-300 hover:border-emerald-400 bg-emerald-50/30"
          label="Attending Parties"
          value={attendingCount}
          colorClass="text-emerald-700"
          icon={<UserCheck className="w-6 h-6 text-emerald-600" />}
          subtext={`${attendingCount} of ${totalInvited} parties confirmed`}
          progress={attendingPercent}
          progressColor="bg-emerald-500"
          onClick={() => onFilterClick?.('attending')}
        />
        <StatCard
          primary
          accentBorderClass="border-[#e08aa3] hover:border-[#b05570] bg-[#fff5f8]"
          label="Total Headcount"
          value={totalGuestCount}
          colorClass="text-[#b05570]"
          icon={<UserPlus className="w-6 h-6 text-[#e08aa3]" />}
          subtext="Confirmed attendee guests"
          progress={attendingPercent}
          progressColor="bg-[#e08aa3]"
          onClick={() => onFilterClick?.('attending')}
        />
        <StatCard
          primary
          accentBorderClass="border-amber-300 hover:border-amber-400 bg-amber-50/30"
          label="Pending Response"
          value={pendingCount}
          colorClass="text-amber-600"
          icon={<Clock className="w-6 h-6 text-amber-500" />}
          subtext={`${pendingCount} of ${totalInvited} awaiting reply`}
          progress={pendingPercent}
          progressColor="bg-amber-500"
          onClick={() => onFilterClick?.('pending')}
        />
      </div>

      {/* Task 2.2 & 3.2: Secondary Compact Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Invited"
          value={totalInvited}
          colorClass="text-[#704655]"
          icon={<Users className="w-4 h-4 text-[#b592a0]" />}
          subtext="Total on guest list"
          onClick={() => onFilterClick?.('all')}
        />
        <StatCard
          label="Declined"
          value={declinedCount}
          colorClass="text-rose-600"
          icon={<UserX className="w-4 h-4 text-rose-500" />}
          subtext={`${declinedCount} cannot attend`}
          onClick={() => onFilterClick?.('declined')}
        />
        <StatCard
          label="Links Sent"
          value={sentCount}
          colorClass="text-[#128C7E]"
          icon={<Send className="w-4 h-4 text-[#25D366]" />}
          subtext={`${sentCount} shared`}
          onClick={() => onFilterClick?.('notsent')}
        />
        <StatCard
          label="Opened (Pending)"
          value={openedNotRespondedCount}
          colorClass="text-[#8a243e]"
          icon={<Eye className="w-4 h-4 text-[#e08aa3]" />}
          subtext={`${openedNotRespondedCount} viewed invite`}
          onClick={() => onFilterClick?.('opened_unresponded')}
        />
      </div>

      {/* RSVP Distribution & Task 2.3 Interactive Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ResponseBar
            attendingPercent={Math.round(attendingPercent)}
            declinedPercent={Math.round(declinedPercent)}
            pendingPercent={Math.round(pendingPercent)}
          />
        </div>

        {/* Task 2.3: Interactive Donut Chart with Tooltips and Click Navigation */}
        <div className="bg-white rounded-2xl p-5 border border-[#e08aa3]/15 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#f2b8c6"
                strokeWidth="12"
                opacity="0.2"
              />
              {totalInvited > 0 && (
                <>
                  {/* Attending segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={hoveredSegment === 'attending' ? '14' : '12'}
                    strokeDasharray={`${attendingStroke} ${circumference}`}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredSegment('attending')}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => onFilterClick?.('attending')}
                  />
                  {/* Declined segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={hoveredSegment === 'declined' ? '14' : '12'}
                    strokeDasharray={`${declinedStroke} ${circumference}`}
                    strokeDashoffset={-attendingStroke}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredSegment('declined')}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => onFilterClick?.('declined')}
                  />
                  {/* Pending segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={hoveredSegment === 'pending' ? '14' : '12'}
                    strokeDasharray={`${pendingStroke} ${circumference}`}
                    strokeDashoffset={-(attendingStroke + declinedStroke)}
                    strokeLinecap="round"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredSegment('pending')}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => onFilterClick?.('pending')}
                  />
                </>
              )}
            </svg>

            {/* Donut Center Label / Live Hover Tooltip */}
            <div
              onClick={() => onFilterClick?.('all')}
              className="absolute inset-0 flex flex-col items-center justify-center text-center cursor-pointer pointer-events-auto"
              title="Click to view all guests"
            >
              {hoveredSegment === 'attending' ? (
                <>
                  <span className="text-[10px] font-label uppercase font-bold text-emerald-700">Attending</span>
                  <span className="text-base font-display font-extrabold text-emerald-700">{attendingCount}</span>
                  <span className="text-[9px] text-[#b592a0]">{Math.round(attendingPercent)}%</span>
                </>
              ) : hoveredSegment === 'declined' ? (
                <>
                  <span className="text-[10px] font-label uppercase font-bold text-rose-600">Declined</span>
                  <span className="text-base font-display font-extrabold text-rose-600">{declinedCount}</span>
                  <span className="text-[9px] text-[#b592a0]">{Math.round(declinedPercent)}%</span>
                </>
              ) : hoveredSegment === 'pending' ? (
                <>
                  <span className="text-[10px] font-label uppercase font-bold text-amber-600">Pending</span>
                  <span className="text-base font-display font-extrabold text-amber-600">{pendingCount}</span>
                  <span className="text-[9px] text-[#b592a0]">{Math.round(pendingPercent)}%</span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-label uppercase font-semibold text-[#b592a0]">Total</span>
                  <span className="text-base font-display font-bold text-[#4a3038]">{totalInvited}</span>
                  <span className="text-[9px] text-[#e08aa3] font-medium">Click filter</span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Legend with click actions */}
          <div className="space-y-2 text-xs font-body w-full sm:w-auto">
            <button
              onClick={() => onFilterClick?.('attending')}
              onMouseEnter={() => setHoveredSegment('attending')}
              onMouseLeave={() => setHoveredSegment(null)}
              className="w-full flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[#4a3038] font-medium">Attending</span>
              </div>
              <span className="font-bold text-emerald-700">{attendingCount} ({Math.round(attendingPercent)}%)</span>
            </button>

            <button
              onClick={() => onFilterClick?.('declined')}
              onMouseEnter={() => setHoveredSegment('declined')}
              onMouseLeave={() => setHoveredSegment(null)}
              className="w-full flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[#4a3038] font-medium">Declined</span>
              </div>
              <span className="font-bold text-rose-600">{declinedCount} ({Math.round(declinedPercent)}%)</span>
            </button>

            <button
              onClick={() => onFilterClick?.('pending')}
              onMouseEnter={() => setHoveredSegment('pending')}
              onMouseLeave={() => setHoveredSegment(null)}
              className="w-full flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-amber-50 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[#4a3038] font-medium">Pending</span>
              </div>
              <span className="font-bold text-amber-600">{pendingCount} ({Math.round(pendingPercent)}%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Responses Stream */}
      {respondedInvitees.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-[#e08aa3]/15 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display text-base font-bold text-[#4a3038]">
              Recent Activity &amp; Responses
            </h4>
            <span className="font-label text-xs uppercase tracking-wider text-[#b592a0]">
              Last {respondedInvitees.length} RSVPs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {respondedInvitees.map((invitee) => (
              <div
                key={invitee.id}
                className="p-3.5 rounded-xl border border-[#e08aa3]/15 bg-[#fffafc] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-body text-sm font-semibold text-[#4a3038] block truncate">
                    {invitee.name}
                  </span>
                  <span className="text-[11px] text-[#b592a0] block">
                    {invitee.responded_at ? formatTimeAgo(invitee.responded_at) : 'Just now'}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold shrink-0 ${
                    invitee.rsvp === 'attending'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {invitee.rsvp === 'attending'
                    ? `+${invitee.guest_count || 1}`
                    : 'Declined'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature: Guest Prayers, Wishes & Special Requests Aggregator */}
      <GuestNotesSection
        invitees={invitees}
        onGuestClick={(guestId) => onGuestClick?.(guestId)}
      />
    </div>
  );
};
