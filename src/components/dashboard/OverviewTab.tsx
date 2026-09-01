import React from 'react';
import { Invitee } from '@/lib/types';
import { StatCard } from './StatCard';
import { ResponseBar } from './ResponseBar';
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
} from 'lucide-react';

interface OverviewTabProps {
  invitees: Invitee[];
  onNavigateToAdd?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ invitees, onNavigateToAdd }) => {
  const totalInvited = invitees.length;
  const attendingList = invitees.filter((i) => i.rsvp === 'attending');
  const attendingCount = attendingList.length;
  const totalGuestCount = attendingList.reduce((acc, curr) => acc + (curr.guest_count || 1), 0);
  const declinedCount = invitees.filter((i) => i.rsvp === 'declined').length;
  const pendingCount = invitees.filter((i) => i.rsvp === 'pending').length;
  const notSentCount = invitees.filter((i) => !i.shared_at).length;
  const sentCount = totalInvited - notSentCount;

  const attendingPercent = totalInvited > 0 ? (attendingCount / totalInvited) * 100 : 0;
  const declinedPercent = totalInvited > 0 ? (declinedCount / totalInvited) * 100 : 0;
  const pendingPercent = totalInvited > 0 ? (pendingCount / totalInvited) * 100 : 0;
  const sentPercent = totalInvited > 0 ? (sentCount / totalInvited) * 100 : 0;
  const respondedCount = attendingCount + declinedCount;
  const respondedPercent = totalInvited > 0 ? (respondedCount / totalInvited) * 100 : 0;

  // Last 8 responses (only attending or declined guests)
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

      {/* 6 Responsive Stat Cards with Context & Progress */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Invited"
          value={totalInvited}
          colorClass="text-[#b05570]"
          icon={<Users className="w-5 h-5 text-[#e08aa3]" />}
          subtext="Invited Parties"
          progress={100}
          progressColor="bg-[#b05570]"
        />
        <StatCard
          label="Attending"
          value={attendingCount}
          colorClass="text-emerald-600"
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          subtext={`${attendingCount} of ${totalInvited}`}
          progress={attendingPercent}
          progressColor="bg-emerald-500"
        />
        <StatCard
          label="Declined"
          value={declinedCount}
          colorClass="text-rose-600"
          icon={<UserX className="w-5 h-5 text-rose-500" />}
          subtext={`${declinedCount} of ${totalInvited}`}
          progress={declinedPercent}
          progressColor="bg-rose-500"
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          colorClass="text-amber-500"
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          subtext={`${pendingCount} of ${totalInvited}`}
          progress={pendingPercent}
          progressColor="bg-amber-500"
        />
        <StatCard
          label="Headcount"
          value={totalGuestCount}
          colorClass="text-[#e08aa3]"
          icon={<UserPlus className="w-5 h-5 text-[#e08aa3]" />}
          subtext="Total Attendees"
          progress={attendingPercent}
          progressColor="bg-[#e08aa3]"
        />
        <StatCard
          label="Links Sent"
          value={sentCount}
          colorClass="text-[#128C7E]"
          icon={<Send className="w-5 h-5 text-[#25D366]" />}
          subtext={`${sentCount} of ${totalInvited}`}
          progress={sentPercent}
          progressColor="bg-[#25D366]"
        />
      </div>

      {/* RSVP Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ResponseBar
            attendingPercent={Math.round(attendingPercent)}
            declinedPercent={Math.round(declinedPercent)}
            pendingPercent={Math.round(pendingPercent)}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#e08aa3]/15 shadow-sm flex items-center gap-5">
          {/* Simple SVG donut chart */}
          <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0 -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f2b8c6" strokeWidth="12" opacity="0.25" />
            {totalInvited > 0 && (
              <>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${(attendingCount / totalInvited) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="12"
                  strokeDasharray={`${(declinedCount / totalInvited) * 251.2} 251.2`}
                  strokeDashoffset={-(attendingCount / totalInvited) * 251.2}
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${(pendingCount / totalInvited) * 251.2} 251.2`}
                  strokeDashoffset={-((attendingCount + declinedCount) / totalInvited) * 251.2}
                  strokeLinecap="round"
                />
              </>
            )}
            <text
              x="50"
              y="55"
              textAnchor="middle"
              className="fill-[#4a3038] font-display text-[13px] font-bold"
              transform="rotate(90 50 50)"
            >
              {totalInvited}
            </text>
          </svg>

          <div className="flex-1 space-y-2">
            <h4 className="font-display text-sm font-bold text-[#4a3038]">RSVP Distribution</h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-body">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Attending
                </span>
                <span className="font-semibold text-[#4a3038]">{attendingCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-body">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Declined
                </span>
                <span className="font-semibold text-[#4a3038]">{declinedCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-body">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pending
                </span>
                <span className="font-semibold text-[#4a3038]">{pendingCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Responses List */}
      <div className="bg-white rounded-2xl p-6 border border-[#e08aa3]/15 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display text-base font-bold text-[#4a3038]">
            Recent Responses
          </h4>
          <span className="font-label text-xs uppercase tracking-wider text-[#b592a0]">
            Last 8 Responses
          </span>
        </div>

        {respondedInvitees.length === 0 ? (
          <div className="text-center py-8 text-[#b592a0] font-body text-sm">
            No responses recorded yet. Responses will appear here live.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {respondedInvitees.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between hover:bg-gray-50/50 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      item.rsvp === 'attending'
                        ? 'bg-emerald-500'
                        : item.rsvp === 'declined'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <p className="font-display text-sm font-semibold text-[#4a3038]">
                      {item.name}
                    </p>
                    <p className="font-body text-xs text-[#b592a0]">
                      {item.rsvp === 'attending'
                        ? `Attending with ${item.guest_count} ${
                            item.guest_count === 1 ? 'guest' : 'guests'
                          }`
                        : 'Cannot attend'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-label uppercase tracking-wider font-semibold ${
                      item.rsvp === 'attending'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {item.rsvp}
                  </span>
                  <span className="block text-[11px] font-body text-gray-400 mt-0.5">
                    {formatTimeAgo(item.responded_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
