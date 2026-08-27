import React from 'react';
import { Invitee } from '@/lib/types';
import { StatCard } from './StatCard';
import { ResponseBar } from './ResponseBar';
import { formatTimeAgo } from '@/lib/utils';
import { Users, UserCheck, UserX, Clock, UserPlus, Send } from 'lucide-react';

interface OverviewTabProps {
  invitees: Invitee[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ invitees }) => {
  const totalInvited = invitees.length;
  const attendingList = invitees.filter((i) => i.rsvp === 'attending');
  const attendingCount = attendingList.length;
  const totalGuestCount = attendingList.reduce((acc, curr) => acc + (curr.guest_count || 1), 0);
  const declinedCount = invitees.filter((i) => i.rsvp === 'declined').length;
  const pendingCount = invitees.filter((i) => i.rsvp === 'pending').length;
  const notSentCount = invitees.filter((i) => !i.shared_at).length;

  const attendingPercent = totalInvited > 0 ? Math.round((attendingCount / totalInvited) * 100) : 0;
  const declinedPercent = totalInvited > 0 ? Math.round((declinedCount / totalInvited) * 100) : 0;
  const pendingPercent = totalInvited > 0 ? Math.round((pendingCount / totalInvited) * 100) : 0;

  // Last 8 responses
  const respondedInvitees = invitees
    .filter((i) => i.responded_at)
    .sort(
      (a, b) =>
        new Date(b.responded_at!).getTime() - new Date(a.responded_at!).getTime()
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* 5 Responsive Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Invited"
          value={totalInvited}
          colorClass="text-[#b05570]"
          icon={<Users className="w-5 h-5 text-[#e08aa3]" />}
          subtext="Invited Parties"
        />
        <StatCard
          label="Attending"
          value={attendingCount}
          colorClass="text-emerald-600"
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          subtext={`${attendingPercent}% of total`}
        />
        <StatCard
          label="Declined"
          value={declinedCount}
          colorClass="text-rose-600"
          icon={<UserX className="w-5 h-5 text-rose-500" />}
          subtext={`${declinedPercent}% of total`}
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          colorClass="text-amber-500"
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          subtext={`${pendingPercent}% of total`}
        />
        <StatCard
          label="Total Guests"
          value={totalGuestCount}
          colorClass="text-[#e08aa3]"
          icon={<UserPlus className="w-5 h-5 text-[#e08aa3]" />}
          subtext="Attending Headcount"
        />

        <StatCard
          label="Not Yet Sent"
          value={notSentCount}
          colorClass="text-[#128C7E]"
          icon={<Send className="w-5 h-5 text-[#25D366]" />}
          subtext="Links not shared"
        />
      </div>

      {/* Tri-color Response Rate Bar */}
      <ResponseBar
        attendingPercent={attendingPercent}
        declinedPercent={declinedPercent}
        pendingPercent={pendingPercent}
      />

      {/* Recent 8 Responses List */}
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
