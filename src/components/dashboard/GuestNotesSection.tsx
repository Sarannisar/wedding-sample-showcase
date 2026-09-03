import React, { useState, useMemo } from 'react';
import { Invitee } from '@/lib/types';
import { formatTimeAgo } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { MessageSquareHeart, Copy, Check, Filter, Utensils, HeartHandshake } from 'lucide-react';

interface GuestNotesSectionProps {
  invitees: Invitee[];
  onGuestClick?: (guestId: string) => void;
}

type NoteCategoryFilter = 'all' | 'attending' | 'dietary';

export const GuestNotesSection: React.FC<GuestNotesSectionProps> = ({
  invitees,
  onGuestClick,
}) => {
  const [filter, setFilter] = useState<NoteCategoryFilter>('all');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  // Collect all guests who submitted notes
  const guestsWithNotes = useMemo(() => {
    return invitees.filter(
      (i) => i.notes && typeof i.notes === 'string' && i.notes.trim().length > 0
    );
  }, [invitees]);

  // Dietary / Special assistance keyword detector
  const isDietaryOrSpecial = (note: string) => {
    const keywords = [
      'veg',
      'vegetarian',
      'vegan',
      'diet',
      'allerg',
      'nut',
      'gluten',
      'seafood',
      'halal',
      'wheelchair',
      'elderly',
      'seat',
      'chair',
      'special',
      'child',
      'baby',
      'stroller',
    ];
    const lower = note.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  };

  const filteredNotes = useMemo(() => {
    return guestsWithNotes.filter((i) => {
      const noteText = (i.notes || '').toLowerCase();
      const nameText = i.name.toLowerCase();
      const q = search.toLowerCase().trim();

      const matchesSearch = !q || noteText.includes(q) || nameText.includes(q);

      if (!matchesSearch) return false;

      if (filter === 'attending') {
        return i.rsvp === 'attending';
      }
      if (filter === 'dietary') {
        return isDietaryOrSpecial(i.notes || '');
      }
      return true;
    });
  }, [guestsWithNotes, filter, search]);

  const handleCopyAllNotes = () => {
    if (filteredNotes.length === 0) return;

    const summary = filteredNotes
      .map(
        (i) =>
          `• ${i.name} (${i.rsvp === 'attending' ? `Attending, ${i.guest_count || 1} guests` : 'Declined'}):\n  "${i.notes?.trim()}"`
      )
      .join('\n\n');

    navigator.clipboard.writeText(summary);
    setCopied(true);
    notify.success(`Copied ${filteredNotes.length} guest notes to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const dietaryCount = useMemo(() => {
    return guestsWithNotes.filter((i) => isDietaryOrSpecial(i.notes || '')).length;
  }, [guestsWithNotes]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e08aa3]/20 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#e08aa3]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#fff0f4] flex items-center justify-center text-[#b05570]">
            <MessageSquareHeart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-bold text-[#4a3038]">
                Guest Prayers, Wishes &amp; Special Requests
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#fce7ed] text-[#b05570] text-xs font-semibold">
                {guestsWithNotes.length}
              </span>
            </div>
            <p className="text-xs text-[#b592a0] mt-0.5">
              Personal prayers, congratulations, and dietary/seating requirements submitted with RSVPs
            </p>
          </div>
        </div>

        {/* Copy All Action */}
        {guestsWithNotes.length > 0 && (
          <button
            onClick={handleCopyAllNotes}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e08aa3]/30 bg-[#fffafc] hover:bg-[#fdeef3] text-[#b05570] text-xs font-semibold transition cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Notes</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      {guestsWithNotes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition shrink-0 ${
                filter === 'all'
                  ? 'bg-[#b05570] text-white shadow-xs'
                  : 'bg-[#fff0f4] text-[#4a3038] hover:bg-[#fce7ed]'
              }`}
            >
              <span>All Notes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {guestsWithNotes.length}
              </span>
            </button>

            <button
              onClick={() => setFilter('attending')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition shrink-0 ${
                filter === 'attending'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50'
              }`}
            >
              <HeartHandshake className="w-3 h-3" />
              <span>Attending Guests</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                {guestsWithNotes.filter((i) => i.rsvp === 'attending').length}
              </span>
            </button>

            <button
              onClick={() => setFilter('dietary')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition shrink-0 ${
                filter === 'dietary'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/50'
              }`}
            >
              <Utensils className="w-3 h-3" />
              <span>Dietary / Assistance</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                {dietaryCount}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search notes or names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#fffafc] border border-[#e08aa3]/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#b05570]"
            />
            <Filter className="w-3.5 h-3.5 text-[#b592a0] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
          {filteredNotes.map((invitee) => {
            const isDietary = isDietaryOrSpecial(invitee.notes || '');

            return (
              <div
                key={invitee.id}
                onClick={() => onGuestClick?.(invitee.id)}
                role={onGuestClick ? 'button' : undefined}
                tabIndex={onGuestClick ? 0 : undefined}
                onKeyDown={
                  onGuestClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onGuestClick(invitee.id);
                        }
                      }
                    : undefined
                }
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  onGuestClick
                    ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-[#e08aa3] focus-visible:outline-none'
                    : ''
                } ${
                  isDietary
                    ? 'border-amber-200 bg-[#fffdf7] hover:border-amber-300 shadow-xs'
                    : 'border-[#e08aa3]/20 bg-[#fffafc] hover:border-[#b05570]/30 shadow-xs'
                }`}
              >
                <div>
                  {/* Top bar: Guest name + RSVP badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-body text-sm font-bold text-[#4a3038] truncate">
                      {invitee.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-label uppercase tracking-wider font-semibold shrink-0 ${
                        invitee.rsvp === 'attending'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {invitee.rsvp === 'attending'
                        ? `Attending (+${invitee.guest_count || 1})`
                        : 'Declined'}
                    </span>
                  </div>

                  {/* Note body */}
                  <p className="font-serif italic text-xs sm:text-sm text-[#4a3038]/90 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-[#e08aa3]/10">
                    "{invitee.notes}"
                  </p>
                </div>

                {/* Footer tags */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#e08aa3]/10 text-[11px] text-[#b592a0]">
                  <span>
                    {invitee.responded_at
                      ? formatTimeAgo(invitee.responded_at)
                      : 'Recently submitted'}
                  </span>
                  {isDietary && (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      <Utensils className="w-2.5 h-2.5" />
                      Special Request
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : guestsWithNotes.length > 0 ? (
        <div className="py-8 text-center text-sm text-[#b592a0]">
          No notes match your filter or search query.
        </div>
      ) : (
        <div className="py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#fdeef3] flex items-center justify-center text-[#b05570] mx-auto mb-2">
            <MessageSquareHeart className="w-6 h-6 opacity-60" />
          </div>
          <h4 className="font-serif text-sm font-semibold text-[#4a3038]">
            No Guest Notes or Special Requests Yet
          </h4>
          <p className="text-xs text-[#b592a0] max-w-md mx-auto mt-1">
            When guests respond to their invitation and write personalized prayers, well-wishes, or dietary/assistance requests, they will automatically be aggregated here.
          </p>
        </div>
      )}
    </div>
  );
};
