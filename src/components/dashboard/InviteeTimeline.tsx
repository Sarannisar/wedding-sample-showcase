import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Invitee, InviteeEvent } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  UserPlus,
  Send,
  Eye,
  BellRing,
  CheckCircle2,
  Calendar,
  MapPin,
} from 'lucide-react';

interface InviteeTimelineProps {
  invitee: Invitee;
  events: InviteeEvent[];
  isLoading?: boolean;
}

interface TimelineGroup {
  id: string;
  type: string;
  count: number;
  latestTimestamp: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  colorClass: string;
  dotColorClass: string;
}

export const InviteeTimeline: React.FC<InviteeTimelineProps> = ({
  invitee,
  events = [],
  isLoading = false,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Aggregate and group events into chronological visual stages
  const timelineGroups: TimelineGroup[] = useMemo(() => {
    // 1. Map known events from invitee_events table
    const openEvents = events.filter((e) => e.type === 'opened');
    const sentEvents = events.filter((e) => e.type === 'sent');
    const remindedEvents = events.filter((e) => e.type === 'reminded');
    const respondedEvents = events.filter((e) => e.type === 'responded');
    const calendarEvents = events.filter((e) => (e.type as string) === 'calendar_added');
    const mapEvents = events.filter((e) => (e.type as string) === 'maps_opened');

    const groups: TimelineGroup[] = [];

    // Stage 1: Created
    groups.push({
      id: 'created',
      type: 'created',
      count: 1,
      latestTimestamp: invitee.created_at,
      label: 'Invitation Created',
      description: `Unique invitation link generated for ${invitee.name}`,
      icon: <UserPlus className="w-3.5 h-3.5" />,
      colorClass: 'text-[#b05570]',
      dotColorClass: 'bg-[#b05570]',
    });

    // Stage 2: Sent (from events or invitee.shared_at)
    const sentTime = sentEvents[0]?.created_at || invitee.shared_at;
    if (sentTime) {
      groups.push({
        id: 'sent',
        type: 'sent',
        count: Math.max(1, sentEvents.length),
        latestTimestamp: sentTime,
        label: sentEvents.length > 1 ? `Invitation Sent (${sentEvents.length}×)` : 'Invitation Sent',
        description: 'Personal invitation link shared via WhatsApp / SMS',
        icon: <Send className="w-3.5 h-3.5" />,
        colorClass: 'text-indigo-600',
        dotColorClass: 'bg-indigo-500',
      });
    }

    // Stage 3: Opened (grouped)
    const openTime = openEvents[0]?.created_at || invitee.first_opened_at || invitee.opened_at;
    if (openTime || openEvents.length > 0) {
      const totalOpens = Math.max(openEvents.length, 1);
      groups.push({
        id: 'opened',
        type: 'opened',
        count: totalOpens,
        latestTimestamp: openTime || invitee.created_at,
        label: totalOpens > 1 ? `Opened ${totalOpens} Times` : 'Invitation Opened',
        description:
          totalOpens > 1
            ? `Guest viewed the portal ${totalOpens} times`
            : 'Guest opened their personal royal portal',
        icon: <Eye className="w-3.5 h-3.5" />,
        colorClass: 'text-sky-600',
        dotColorClass: 'bg-sky-500',
      });
    }

    // Stage 4: Reminded (Item 4)
    const remindTime = remindedEvents[0]?.created_at || invitee.reminded_at;
    if (remindTime || (invitee.reminder_count && invitee.reminder_count > 0)) {
      const count = Math.max(remindedEvents.length, invitee.reminder_count || 1);
      groups.push({
        id: 'reminded',
        type: 'reminded',
        count,
        latestTimestamp: remindTime || invitee.created_at,
        label: count > 1 ? `Reminders Sent (${count}×)` : 'Reminder Sent',
        description: 'Follow-up WhatsApp reminder delivered to guest',
        icon: <BellRing className="w-3.5 h-3.5" />,
        colorClass: 'text-amber-600',
        dotColorClass: 'bg-amber-500',
      });
    }

    // Stage 5: Secondary Interactions
    if (calendarEvents.length > 0) {
      groups.push({
        id: 'calendar',
        type: 'calendar_added',
        count: calendarEvents.length,
        latestTimestamp: calendarEvents[0].created_at,
        label: 'Added to Calendar',
        description: 'Wedding date saved to phone calendar',
        icon: <Calendar className="w-3.5 h-3.5" />,
        colorClass: 'text-purple-600',
        dotColorClass: 'bg-purple-500',
      });
    }

    if (mapEvents.length > 0) {
      groups.push({
        id: 'maps',
        type: 'maps_opened',
        count: mapEvents.length,
        latestTimestamp: mapEvents[0].created_at,
        label: 'Directions Viewed',
        description: 'Reception venue opened in Google Maps',
        icon: <MapPin className="w-3.5 h-3.5" />,
        colorClass: 'text-teal-600',
        dotColorClass: 'bg-teal-500',
      });
    }

    // Stage 6: Responded (from events or invitee.responded_at)
    const respTime = respondedEvents[0]?.created_at || invitee.responded_at;
    if (respTime && invitee.rsvp !== 'pending') {
      const isAttending = invitee.rsvp === 'attending';
      groups.push({
        id: 'responded',
        type: 'responded',
        count: Math.max(1, respondedEvents.length),
        latestTimestamp: respTime,
        label: isAttending
          ? `RSVP: Attending (${invitee.guest_count || 1} guest${invitee.guest_count === 1 ? '' : 's'})`
          : 'RSVP: Regretfully Declined',
        description: invitee.notes ? `Note: "${invitee.notes}"` : 'Response recorded in system',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        colorClass: isAttending ? 'text-emerald-600' : 'text-rose-600',
        dotColorClass: isAttending ? 'bg-emerald-500' : 'bg-rose-500',
      });
    }

    // Sort stages chronologically (oldest at top -> latest at bottom)
    return groups.sort(
      (a, b) => new Date(a.latestTimestamp).getTime() - new Date(b.latestTimestamp).getTime()
    );
  }, [invitee, events]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-3 bg-[#e08aa3]/20 rounded w-32" />
        <div className="h-10 bg-white/70 rounded-xl border border-[#e08aa3]/15" />
        <div className="h-10 bg-white/70 rounded-xl border border-[#e08aa3]/15" />
      </div>
    );
  }

  if (timelineGroups.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[#7a4d5d] italic font-body">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 pr-2 py-3">
      {/* Continuous vertical connecting line */}
      <div className="absolute left-[33px] top-5 bottom-5 w-[1.5px] bg-[#e08aa3]/25 pointer-events-none" />

      <div className="space-y-4">
        {timelineGroups.map((group, idx) => {
          return (
            <motion.div
              key={group.id}
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: prefersReducedMotion ? 0 : idx * 0.04,
                duration: 0.25,
              }}
              className="relative flex items-start gap-3.5 group"
            >
              {/* Timeline node icon / dot */}
              <div
                className={`relative z-10 w-6 h-6 rounded-full bg-white border border-[#e08aa3]/30 shadow-xs flex items-center justify-center shrink-0 ${group.colorClass}`}
              >
                {group.icon}
              </div>

              {/* Node content */}
              <div className="flex-1 bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-[#e08aa3]/15 shadow-2xs hover:border-[#e08aa3]/35 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-xs font-semibold text-[#4a3038]">
                    {group.label}
                  </span>
                  <span
                    className="font-label text-[10px] text-[#7a4d5d] shrink-0"
                    title={new Date(group.latestTimestamp).toLocaleString()}
                  >
                    {formatRelativeTime(group.latestTimestamp)}
                  </span>
                </div>

                {group.description && (
                  <p className="font-body text-[11px] text-[#704655] mt-1 leading-snug">
                    {group.description}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
