import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, CalendarPlus, Check } from 'lucide-react';
import { downloadCalendarIcs } from '@/lib/calendar';
import { logInviteeEvent } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { useReveal } from '@/lib/useReveal';

interface SaveShareActionRowProps {
  inviteeId?: string;
}

export const SaveShareActionRow: React.FC<SaveShareActionRowProps> = ({ inviteeId }) => {
  const [copied, setCopied] = useState(false);
  const revealProps = useReveal();

  const handleShare = async () => {
    const shareData = {
      title: 'Safiyya & Sharrafuth — Wedding Invitation',
      text: 'With immense joy and gratitude, Safiyya & Sharrafuth invite you to celebrate their wedding insha Allah.',
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      notify.success('Invitation link copied to clipboard 💗');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify.error('Could not copy link automatically.');
    }
  };

  const handleCalendar = () => {
    downloadCalendarIcs();
    if (inviteeId) {
      void logInviteeEvent(inviteeId, 'calendar_added');
    }
    notify.success('Downloaded calendar event file (.ics)');
  };

  return (
    <motion.div
      {...revealProps}
      className="w-full max-w-xl mx-auto my-4 px-3 flex flex-wrap items-center justify-center gap-3"
      role="group"
      aria-label="Invitation actions"
    >
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#f2b8c6] bg-white/90 text-[#4a3038] hover:bg-[#fff0f4] active:scale-98 transition shadow-xs text-xs font-label uppercase tracking-widest font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e08aa3]"
        aria-label="Save or share invitation link"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#e08aa3]" />
        ) : (
          <Share2 className="w-3.5 h-3.5 text-[#e08aa3]" />
        )}
        <span>{copied ? 'Link Copied' : 'Save Invitation'}</span>
      </button>

      <button
        onClick={handleCalendar}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#f2b8c6] bg-white/90 text-[#4a3038] hover:bg-[#fff0f4] active:scale-98 transition shadow-xs text-xs font-label uppercase tracking-widest font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e08aa3]"
        aria-label="Add wedding to your calendar"
      >
        <CalendarPlus className="w-3.5 h-3.5 text-[#e08aa3]" />
        <span>Add to Calendar</span>
      </button>
    </motion.div>
  );
};
