import React, { useState, useMemo } from 'react';
import { Invitee } from '@/lib/types';
import { StatCard } from './StatCard';
import { GuestNotesSection } from './GuestNotesSection';
import { formatTimeAgo } from '@/lib/utils';
import { printGuestList, printDayOfCoordinatorSheet } from '@/lib/printList';
import { exportSeatingCsv } from '@/lib/csvHelper';
import { notify } from '@/lib/notify';
import { getRsvpWindow } from '@/lib/rsvpDeadline';
import {
  Users,
  UserCheck,
  Clock,
  UserPlus,
  Send,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  BellRing,
  Lock,
  TrendingUp,
  MessageSquare,
  ClipboardCheck,
} from 'lucide-react';

export type OverviewFilter =
  | 'all'
  | 'attending'
  | 'declined'
  | 'pending'
  | 'opened_unresponded'
  | 'notsent'
  | 'ignored';

export interface OverviewTabProps {
  invitees: Invitee[];
  onNavigateToAdd?: () => void;
  onFilterClick?: (status: OverviewFilter) => void;
  onGuestClick?: (guestId: string) => void;
  onRemindAll?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  invitees,
  onNavigateToAdd,
  onFilterClick,
  onGuestClick,
  onRemindAll,
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<'attending' | 'declined' | 'pending' | null>(
    null
  );

  const totalInvited = invitees.length;
  const attendingList = useMemo(() => invitees.filter((i) => i.rsvp === 'attending'), [invitees]);
  const attendingCount = attendingList.length;
  const totalGuestCount = useMemo(
    () => attendingList.reduce((acc, curr) => acc + (curr.guest_count || 1), 0),
    [attendingList]
  );
  const declinedCount = useMemo(
    () => invitees.filter((i) => i.rsvp === 'declined').length,
    [invitees]
  );
  const pendingCount = useMemo(
    () => invitees.filter((i) => i.rsvp === 'pending').length,
    [invitees]
  );
  const notSentCount = useMemo(
    () => invitees.filter((i) => !i.shared_at).length,
    [invitees]
  );

  // Pending & sent count (eligible for reminder)
  const pendingAndSentCount = useMemo(
    () => invitees.filter((i) => i.rsvp === 'pending' && Boolean(i.shared_at)).length,
    [invitees]
  );

  // Reminders metrics
  const totalRemindersSent = useMemo(
    () => invitees.reduce((acc, curr) => acc + (curr.reminder_count || 0), 0),
    [invitees]
  );
  const guestsRemindedCount = useMemo(
    () => invitees.filter((i) => (i.reminder_count || 0) > 0).length,
    [invitees]
  );

  // RSVP deadline / lock metrics (Item 3)
  const { lockedCount, openCount } = useMemo(() => {
    let locked = 0;
    let open = 0;
    for (const inv of invitees) {
      const win = getRsvpWindow(inv.first_opened_at ?? inv.created_at);
      if (win.isOpen) open++;
      else locked++;
    }
    return { lockedCount: locked, openCount: open };
  }, [invitees]);

  const attendingPercent = totalInvited > 0 ? (attendingCount / totalInvited) * 100 : 0;
  const declinedPercent = totalInvited > 0 ? (declinedCount / totalInvited) * 100 : 0;
  const pendingPercent = totalInvited > 0 ? (pendingCount / totalInvited) * 100 : 0;
  const respondedCount = attendingCount + declinedCount;
  const respondedPercent = totalInvited > 0 ? (respondedCount / totalInvited) * 100 : 0;

  // Last 8 responses
  const respondedInvitees = useMemo(
    () =>
      invitees
        .filter((i) => i.rsvp !== 'pending' && Boolean(i.responded_at))
        .sort(
          (a, b) =>
            new Date(b.responded_at!).getTime() - new Date(a.responded_at!).getTime()
        )
        .slice(0, 8),
    [invitees]
  );

  // Response velocity sparkline (last 14 days)
  const sparklineData = useMemo(() => {
    const days = 14;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const points: { dateStr: string; label: string; count: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      points.push({ dateStr: dateKey, label, count: 0 });
    }

    for (const inv of invitees) {
      if (inv.responded_at) {
        const respDate = inv.responded_at.slice(0, 10);
        const pt = points.find((p) => p.dateStr === respDate);
        if (pt) pt.count++;
      }
    }

    return points;
  }, [invitees]);

  const total14DayResponses = useMemo(
    () => sparklineData.reduce((acc, p) => acc + p.count, 0),
    [sparklineData]
  );

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

  const handlePrintDayOfSheet = () => {
    if (invitees.length === 0) {
      notify.info('No guests to print yet.');
      return;
    }
    printDayOfCoordinatorSheet(invitees);
    notify.success('Opening Day-Of Reception & Usher Roster...');
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

  // Sparkline coordinates math
  const sparkWidth = 260;
  const sparkHeight = 40;
  const maxCount = Math.max(...sparklineData.map((d) => d.count), 1);
  const sparkPoints = sparklineData.map((d, index) => {
    const x = (index / (sparklineData.length - 1)) * sparkWidth;
    const y = sparkHeight - (d.count / maxCount) * (sparkHeight - 8) - 4;
    return { x, y, ...d };
  });
  const sparkPointsStr = sparkPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const sparkAreaStr = `0,${sparkHeight} ${sparkPointsStr} ${sparkWidth},${sparkHeight}`;

  return (
    <div className="space-y-6">
      {/* Top Action Bar for Print & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e08aa3]/15 shadow-xs">
        <div>
          <span className="font-display text-base font-bold text-[#4a3038] block">
            Guest Overview &amp; Metrics
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

          <button
            onClick={handlePrintDayOfSheet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 transition border border-purple-200 text-xs font-label uppercase tracking-wider font-medium cursor-pointer"
            title="Print coordinator & usher check-in sheet with checkboxes & history"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Day-Of Sheet</span>
          </button>
        </div>
      </div>

      {/* Hero Stat Band: Attending / Headcount / Pending (Full Width 3 Cards with 4xl type) */}
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

      {/* Slim 4-up Secondary Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Not Sent */}
        <div
          onClick={() => onFilterClick?.('notsent')}
          role="button"
          tabIndex={0}
          className="rounded-2xl p-4 bg-white/90 border border-[#e08aa3]/15 shadow-xs hover:border-[#128C7E]/40 hover:-translate-y-0.5 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-label uppercase tracking-wider font-semibold text-[#7a4d5d]">
              Not Sent
            </span>
            <Send className="w-4 h-4 text-[#128C7E]" />
          </div>
          <div className="my-1.5">
            <span className="font-display font-bold text-2xl text-[#128C7E]">
              {notSentCount}
            </span>
          </div>
          <span className="text-xs font-body text-[#7a4d5d]">
            {notSentCount} awaiting link
          </span>
        </div>

        {/* Pending & Sent with "Remind all" Shortcut */}
        <div className="rounded-2xl p-4 bg-white/90 border border-[#e08aa3]/15 shadow-xs hover:border-amber-400 hover:-translate-y-0.5 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-label uppercase tracking-wider font-semibold text-[#7a4d5d]">
              Pending &amp; Sent
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="my-1 flex items-baseline justify-between">
            <span
              onClick={() => onFilterClick?.('pending')}
              className="font-display font-bold text-2xl text-amber-600 cursor-pointer"
            >
              {pendingAndSentCount}
            </span>
            {pendingAndSentCount > 0 && onRemindAll && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemindAll();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-label font-bold uppercase tracking-wider transition cursor-pointer"
                title="Open WhatsApp reminder queue for all pending guests"
              >
                <BellRing className="w-3 h-3" />
                <span>Remind all</span>
              </button>
            )}
          </div>
          <span className="text-xs font-body text-[#7a4d5d]">
            {pendingAndSentCount} eligible for reminder
          </span>
        </div>

        {/* Reminders Sent */}
        <div
          onClick={() => onFilterClick?.('all')}
          role="button"
          tabIndex={0}
          className="rounded-2xl p-4 bg-white/90 border border-[#e08aa3]/15 shadow-xs hover:border-[#b05570]/40 hover:-translate-y-0.5 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-label uppercase tracking-wider font-semibold text-[#7a4d5d]">
              Reminders Sent
            </span>
            <BellRing className="w-4 h-4 text-[#b05570]" />
          </div>
          <div className="my-1.5">
            <span className="font-display font-bold text-2xl text-[#b05570]">
              {totalRemindersSent}
            </span>
          </div>
          <span className="text-xs font-body text-[#7a4d5d]">
            across {guestsRemindedCount} guests
          </span>
        </div>

        {/* RSVP Locked / Open */}
        <div
          onClick={() => onFilterClick?.('all')}
          role="button"
          tabIndex={0}
          className="rounded-2xl p-4 bg-white/90 border border-[#e08aa3]/15 shadow-xs hover:border-[#4a3038]/40 hover:-translate-y-0.5 transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-label uppercase tracking-wider font-semibold text-[#7a4d5d]">
              RSVP Window
            </span>
            <Lock className="w-4 h-4 text-[#7a4d5d]" />
          </div>
          <div className="my-1.5">
            <span className="font-display font-bold text-2xl text-[#4a3038]">
              {lockedCount > 0 ? `${lockedCount} locked` : 'All Open'}
            </span>
          </div>
          <span className="text-xs font-body text-[#7a4d5d]">
            {openCount} guests still within window
          </span>
        </div>
      </div>

      {/* 12-Column Desktop Grid: Donut + Sparkline (col-span-5) & Recent Responses (col-span-7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Donut Chart & Response Velocity Sparkline (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#e08aa3]/15 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-[#4a3038]">
              RSVP Status Distribution
            </h4>
            <span className="text-xs font-body text-[#b592a0]">
              Click segment to filter
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Interactive SVG Donut */}
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
                      role="button"
                      tabIndex={0}
                      aria-label={`Attending: ${attendingCount} guests`}
                      className="cursor-pointer transition-all duration-200 focus:outline-none"
                      onMouseEnter={() => setHoveredSegment('attending')}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onFocus={() => setHoveredSegment('attending')}
                      onBlur={() => setHoveredSegment(null)}
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
                      role="button"
                      tabIndex={0}
                      aria-label={`Declined: ${declinedCount} guests`}
                      className="cursor-pointer transition-all duration-200 focus:outline-none"
                      onMouseEnter={() => setHoveredSegment('declined')}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onFocus={() => setHoveredSegment('declined')}
                      onBlur={() => setHoveredSegment(null)}
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
                      role="button"
                      tabIndex={0}
                      aria-label={`Pending: ${pendingCount} guests`}
                      className="cursor-pointer transition-all duration-200 focus:outline-none"
                      onMouseEnter={() => setHoveredSegment('pending')}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onFocus={() => setHoveredSegment('pending')}
                      onBlur={() => setHoveredSegment(null)}
                      onClick={() => onFilterClick?.('pending')}
                    />
                  </>
                )}
              </svg>

              {/* Donut Center Label */}
              <div
                onClick={() => onFilterClick?.('all')}
                role="button"
                tabIndex={0}
                aria-label="Filter all guests"
                className="absolute inset-2 flex flex-col items-center justify-center text-center cursor-pointer pointer-events-auto rounded-full focus-visible:ring-2 focus-visible:ring-[#e08aa3] focus-visible:outline-none"
                title="Click to view all guests"
              >
                {hoveredSegment === 'attending' ? (
                  <>
                    <span className="text-[10px] font-label uppercase font-bold text-emerald-700">Attending</span>
                    <span className="text-base font-display font-extrabold text-emerald-700">{attendingCount}</span>
                    <span className="text-[9px] text-[#7a4d5d]">{Math.round(attendingPercent)}%</span>
                  </>
                ) : hoveredSegment === 'declined' ? (
                  <>
                    <span className="text-[10px] font-label uppercase font-bold text-rose-600">Declined</span>
                    <span className="text-base font-display font-extrabold text-rose-600">{declinedCount}</span>
                    <span className="text-[9px] text-[#7a4d5d]">{Math.round(declinedPercent)}%</span>
                  </>
                ) : hoveredSegment === 'pending' ? (
                  <>
                    <span className="text-[10px] font-label uppercase font-bold text-amber-600">Pending</span>
                    <span className="text-base font-display font-extrabold text-amber-600">{pendingCount}</span>
                    <span className="text-[9px] text-[#7a4d5d]">{Math.round(pendingPercent)}%</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-label uppercase tracking-wider font-bold text-[#4a3038]">Total</span>
                    <span className="text-base font-display font-extrabold text-[#4a3038]">{totalInvited}</span>
                    <span className="text-[9px] text-[#7a4d5d]">Parties</span>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Legend with click actions */}
            <div className="space-y-2 text-xs font-body w-full sm:w-auto flex-1">
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
                <span className="font-bold text-emerald-700">
                  {attendingCount} ({Math.round(attendingPercent)}%)
                </span>
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
                <span className="font-bold text-rose-600">
                  {declinedCount} ({Math.round(declinedPercent)}%)
                </span>
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
                <span className="font-bold text-amber-600">
                  {pendingCount} ({Math.round(pendingPercent)}%)
                </span>
              </button>
            </div>
          </div>

          {/* Response Velocity Sparkline (Item 7) */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#4a3038] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-[#b05570]" />
                <span>Response Velocity (14 Days)</span>
              </div>
              <span className="text-[11px] text-[#7a4d5d] font-medium">
                {total14DayResponses} replies received
              </span>
            </div>

            <div className="relative bg-[#fffafc] rounded-xl p-2.5 border border-[#e08aa3]/15">
              <svg
                viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
                className="w-full h-12 overflow-visible"
              >
                <defs>
                  <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e08aa3" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#e08aa3" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area Fill */}
                <polygon points={sparkAreaStr} fill="url(#sparklineGrad)" />
                {/* Polyline Path */}
                <polyline
                  fill="none"
                  stroke="#b05570"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparkPointsStr}
                />
                {/* Dots on points with > 0 replies */}
                {sparkPoints.map((pt, idx) =>
                  pt.count > 0 ? (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r="3"
                      className="fill-[#b05570] stroke-white stroke-[1.5]"
                    >
                      <title>{`${pt.label}: ${pt.count} response${pt.count > 1 ? 's' : ''}`}</title>
                    </circle>
                  ) : null
                )}
              </svg>

              <div className="flex items-center justify-between text-[10px] text-[#b592a0] pt-1 font-body">
                <span>{sparklineData[0]?.label}</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Responses Stream (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#e08aa3]/15 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-base font-bold text-[#4a3038]">
                Recent Responses
              </h4>
              <p className="text-xs font-body text-[#b592a0]">
                Latest confirmed attendance and messages
              </p>
            </div>
            <button
              onClick={() => onFilterClick?.('all')}
              className="text-xs font-label uppercase tracking-wider font-semibold text-[#b05570] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          {respondedInvitees.length === 0 ? (
            <div className="py-8 text-center text-xs font-body text-[#b592a0] border border-dashed border-[#e08aa3]/20 rounded-xl">
              No responses recorded yet. As guests submit their RSVPs, they will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {respondedInvitees.map((invitee) => (
                <div
                  key={invitee.id}
                  onClick={() => onGuestClick?.(invitee.id)}
                  role="button"
                  tabIndex={0}
                  className="p-3 rounded-xl border border-[#e08aa3]/15 bg-[#fffafc] hover:bg-[#fff0f4] transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-body text-sm font-semibold text-[#4a3038] block truncate">
                      {invitee.name}
                    </span>
                    <span className="text-[11px] text-[#b592a0] block">
                      {invitee.responded_at ? formatTimeAgo(invitee.responded_at) : 'Just now'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {invitee.notes && (
                      <span title="Guest included a note or prayer">
                        <MessageSquare className="w-3.5 h-3.5 text-[#b05570]" />
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-label uppercase tracking-wider font-semibold ${
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feature: Guest Prayers, Wishes & Special Requests Aggregator */}
      <GuestNotesSection
        invitees={invitees}
        onGuestClick={(guestId) => onGuestClick?.(guestId)}
      />
    </div>
  );
};
