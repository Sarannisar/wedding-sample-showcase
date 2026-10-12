import React, { useState, useMemo } from 'react';
import { Invitee } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { getShareableInviteUrl } from '@/lib/shareLinks';
import { formatRelativeTime } from '@/lib/utils';
import {
  Send,
  X,
  Check,
  CheckCircle2,
  Copy,
  Search,
  ArrowRight,
  Sparkles,
  Phone,
  Clock,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react';

export interface BulkWhatsAppSenderModalProps {
  invitees: Invitee[];
  initialSelectedIds?: string[];
  onClose: () => void;
  onMarkShared: (id: string) => Promise<void>;
  onBulkMarkShared?: (ids: string[]) => Promise<void>;
}

export type BulkFilter = 'all' | 'unshared' | 'shared';

export const BulkWhatsAppSenderModal: React.FC<BulkWhatsAppSenderModalProps> = ({
  invitees,
  initialSelectedIds,
  onClose,
  onMarkShared,
  onBulkMarkShared,
}) => {
  // Mode: 'queue' (step-by-step sender) or 'list' (overview table of all links)
  const [viewMode, setViewMode] = useState<'queue' | 'list'>('queue');
  
  // Filter & Search
  const [filter, setFilter] = useState<BulkFilter>(
    initialSelectedIds && initialSelectedIds.length > 0 ? 'all' : 'unshared'
  );
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom message template option
  const defaultTemplate =
    weddingConfig?.whatsapp?.messageTemplate ||
    `Assalamu Alaikum GUEST_NAME\n\nYou are cordially invited to ${weddingConfig.couple.bride} & ${weddingConfig.couple.groom}'s Wedding Ceremony!\n\nView your invitation here: GUEST_LINK`;
  const [customTemplate, setCustomTemplate] = useState<string>(defaultTemplate);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  // Selected invitees for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      return new Set(initialSelectedIds);
    }
    // Default: select all unsent / unshared invitees
    const unshared = (invitees || []).filter((i) => !i.shared_at).map((i) => i.id);
    return new Set(unshared.length > 0 ? unshared : (invitees || []).map((i) => i.id));
  });

  // Track session progress in real-time
  const [sentInSession, setSentInSession] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Step-by-step queue index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filtered queue of targets
  const targetInvitees = useMemo(() => {
    const list = invitees || [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((item) => {
      // Search match
      if (q) {
        const matchesName = item?.name ? item.name.toLowerCase().includes(q) : false;
        const matchesPhone = item?.phone ? item.phone.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPhone) return false;
      }

      // Filter match
      if (filter === 'unshared') return !item.shared_at && !sentInSession.has(item.id);
      if (filter === 'shared') return Boolean(item.shared_at || sentInSession.has(item.id));
      return true;
    });
  }, [invitees, filter, searchQuery, sentInSession]);

  // Selected targets for active sending in queue
  const activeQueue = useMemo(() => {
    return targetInvitees.filter((i) => selectedIds.has(i.id));
  }, [targetInvitees, selectedIds]);

  const currentItem: Invitee | undefined = activeQueue[currentIndex] || activeQueue[0];

  // Helper to compile personalised WhatsApp message
  const compileMessage = (item: Invitee): string => {
    if (!item) return '';
    const url = getShareableInviteUrl(item.slug || '');
    return (customTemplate || defaultTemplate)
      .replace(/GUEST_NAME/g, item.name || 'Guest')
      .replace(/GUEST_LINK/g, url);
  };

  // Open WhatsApp for a given invitee
  const sendWhatsApp = (item: Invitee) => {
    if (!item) return;
    const message = compileMessage(item);
    const phoneParam = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
    const waUrl = phoneParam
      ? `https://api.whatsapp.com/send/?phone=${phoneParam}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Mark as shared in database & session
    setSentInSession((prev) => new Set(prev).add(item.id));
    void onMarkShared(item.id);
  };

  // Next item in queue
  const handleSendAndAdvance = () => {
    if (!currentItem) return;
    sendWhatsApp(currentItem);

    if (currentIndex + 1 < activeQueue.length) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex + 1 < activeQueue.length) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Copy full message
  const handleCopyMessage = (item: Invitee) => {
    const msg = compileMessage(item);
    navigator.clipboard.writeText(msg);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedIds.size === targetInvitees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(targetInvitees.map((i) => i.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Mark all selected as shared
  const handleMarkAllSelectedAsSent = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (onBulkMarkShared) {
      await onBulkMarkShared(ids);
    } else {
      await Promise.all(ids.map((id) => onMarkShared(id)));
    }
    setSentInSession((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  // Unshared count across whole database
  const totalUnsharedCount = useMemo(
    () => invitees.filter((i) => !i.shared_at && !sentInSession.has(i.id)).length,
    [invitees, sentInSession]
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-[#e08aa3]/30 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-[#fff2f6] px-5 sm:px-6 py-4 border-b border-[#e08aa3]/25 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
              <Send className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#4a3038]">
                  WhatsApp Bulk Invite Sender
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#25D366] text-white text-[10px] font-label uppercase font-bold tracking-wider">
                  No Guest Missed
                </span>
              </div>
              <p className="text-xs text-[#7a4d5d]">
                {totalUnsharedCount} unsent invite{totalUnsharedCount !== 1 ? 's' : ''} remaining • {invitees.length} total created
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-white/80 p-1 rounded-xl border border-[#e08aa3]/30 flex items-center text-xs font-semibold">
              <button
                onClick={() => setViewMode('queue')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  viewMode === 'queue'
                    ? 'bg-[#b05570] text-white shadow-xs'
                    : 'text-[#7a4d5d] hover:text-[#4a3038]'
                }`}
              >
                1-by-1 Queue
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#b05570] text-white shadow-xs'
                    : 'text-[#7a4d5d] hover:text-[#4a3038]'
                }`}
              >
                All List ({targetInvitees.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white/80 transition cursor-pointer"
              title="Close sender"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 sm:px-6 py-3 border-b border-gray-100 bg-[#fffafc] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setFilter('unshared');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-xl font-label uppercase tracking-wider text-[11px] font-semibold transition cursor-pointer ${
                filter === 'unshared'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Unsent Only ({totalUnsharedCount})
            </button>
            <button
              onClick={() => {
                setFilter('all');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-xl font-label uppercase tracking-wider text-[11px] font-semibold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#b05570] text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Created ({invitees.length})
            </button>
            <button
              onClick={() => {
                setFilter('shared');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-xl font-label uppercase tracking-wider text-[11px] font-semibold transition cursor-pointer ${
                filter === 'shared'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Sent ({invitees.length - totalUnsharedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guest or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentIndex(0);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs text-[#4a3038] placeholder-gray-400 focus:outline-none focus:border-[#e08aa3]"
            />
          </div>
        </div>

        {/* Message Template Accordion / Toggle */}
        <div className="px-5 sm:px-6 py-2 bg-[#fffdfa] border-b border-amber-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-amber-900 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Message Template contains <code>GUEST_NAME</code> &amp; <code>GUEST_LINK</code></span>
          </div>
          <button
            onClick={() => setShowTemplateEditor(!showTemplateEditor)}
            className="text-[#b05570] hover:underline font-semibold cursor-pointer"
          >
            {showTemplateEditor ? 'Hide Template' : 'Customize Template'}
          </button>
        </div>

        {showTemplateEditor && (
          <div className="px-5 sm:px-6 py-3 bg-[#fff9fa] border-b border-[#e08aa3]/20 space-y-2">
            <textarea
              rows={4}
              value={customTemplate}
              onChange={(e) => setCustomTemplate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[#e08aa3]/30 text-xs font-mono text-[#4a3038] bg-white focus:outline-none focus:border-[#b05570]"
              placeholder="Message template with GUEST_NAME and GUEST_LINK..."
            />
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Use placeholders: <strong>GUEST_NAME</strong> and <strong>GUEST_LINK</strong></span>
              <button
                onClick={() => setCustomTemplate(defaultTemplate)}
                className="text-xs text-[#b05570] hover:underline cursor-pointer"
              >
                Reset to default
              </button>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeQueue.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-gray-50 border border-gray-100 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-display text-lg font-bold text-[#4a3038]">
                {filter === 'unshared' ? 'All Invitations Have Been Sent!' : 'No Guests Found'}
              </h4>
              <p className="text-xs text-[#7a4d5d] max-w-sm mx-auto">
                {filter === 'unshared'
                  ? 'Great job! You have sent invite links to all your created guests. You can switch to "All Created" to re-send or review.'
                  : 'Try changing your search term or filter above.'}
              </p>
            </div>
          ) : viewMode === 'queue' ? (
            /* 1-BY-1 STEPPERS VIEW */
            currentItem ? (
              <div className="space-y-4 animate-fade-in">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[#7a4d5d]">
                      Sending Guest <strong className="text-[#b05570]">{currentIndex + 1}</strong> of{' '}
                      <strong>{activeQueue.length}</strong>
                    </span>
                    <span className="text-[11px] font-mono text-[#a8808e]">
                      {Math.round(((currentIndex + 1) / activeQueue.length) * 100)}% Completed
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#e08aa3] via-[#b05570] to-[#25D366] transition-all duration-300"
                      style={{ width: `${((currentIndex + 1) / activeQueue.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Active Guest Hero Card */}
                <div className="bg-[#fffafc] rounded-3xl p-5 sm:p-6 border-2 border-[#e08aa3]/30 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e08aa3]/15 pb-4">
                    <div>
                      <span className="text-[10px] font-label uppercase tracking-widest text-[#a8808e] font-bold block">
                        Recipient
                      </span>
                      <h3 className="font-display text-2xl font-bold text-[#4a3038]">
                        {currentItem.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#7a4d5d]">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {currentItem.phone ? currentItem.phone : 'No phone recorded (WhatsApp contact picker will open)'}
                        </span>
                        <span>•</span>
                        <span className="text-gray-500 font-mono">
                          /{currentItem.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentItem.shared_at || sentInSession.has(currentItem.id) ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Sent {sentInSession.has(currentItem.id) ? 'just now' : formatRelativeTime(currentItem.shared_at!)}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Not Sent Yet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-label uppercase tracking-wider text-[#7a4d5d] font-bold">
                        WhatsApp Message to Send:
                      </span>
                      <button
                        onClick={() => handleCopyMessage(currentItem)}
                        className="text-xs text-[#b05570] hover:text-[#4a3038] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === currentItem.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-gray-200 text-xs font-mono text-[#3a2830] whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed shadow-inner">
                      {compileMessage(currentItem)}
                    </div>
                  </div>

                  {/* Action buttons row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-initial"
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleSkip}
                        disabled={currentIndex + 1 >= activeQueue.length}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-initial"
                      >
                        Skip
                      </button>
                    </div>

                    <button
                      onClick={handleSendAndAdvance}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-label uppercase tracking-wider font-bold shadow-lg shadow-[#25D366]/30 active:scale-98 transition cursor-pointer"
                    >
                      <Send className="w-4 h-4 fill-current" />
                      <span>
                        {currentIndex + 1 >= activeQueue.length
                          ? 'Send to WhatsApp & Finish'
                          : 'Send & Next Guest'}
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>

                {/* Queue Jump Navigation */}
                <div className="pt-2">
                  <span className="text-[11px] font-label uppercase tracking-wider text-[#a8808e] font-semibold block mb-2">
                    Jump to any guest in queue:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                    {activeQueue.map((item, idx) => {
                      const isSent = item.shared_at || sentInSession.has(item.id);
                      const isCurrent = idx === currentIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setCurrentIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-[#b05570] text-white ring-2 ring-[#e08aa3]'
                              : isSent
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {isSent ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                          <span className="truncate max-w-[120px]">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            /* COMPLETE TABLE LIST VIEW */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#7a4d5d]">
                <button
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-2 hover:text-[#4a3038] cursor-pointer font-semibold"
                >
                  {selectedIds.size === targetInvitees.length ? (
                    <CheckSquare className="w-4 h-4 text-[#b05570]" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Select All ({targetInvitees.length})</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllSelectedAsSent}
                    disabled={selectedIds.size === 0}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#e08aa3]/30 text-[#b05570] hover:bg-[#fff2f6] text-xs font-semibold transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark {selectedIds.size} as Sent</span>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('queue');
                      setCurrentIndex(0);
                    }}
                    disabled={selectedIds.size === 0}
                    className="px-4 py-1.5 rounded-xl bg-[#25D366] text-white hover:bg-[#128C7E] text-xs font-bold transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 fill-current" />
                    <span>Start Sending Queue ({selectedIds.size})</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-[#e08aa3]/20 overflow-hidden shadow-xs">
                <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                  {targetInvitees.map((invitee) => {
                    const isSelected = selectedIds.has(invitee.id);
                    const isSent = Boolean(invitee.shared_at || sentInSession.has(invitee.id));

                    return (
                      <div
                        key={invitee.id}
                        className={`p-3.5 flex items-center justify-between gap-3 hover:bg-[#fffafc] transition ${
                          isSelected ? 'bg-[#fff5f8]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(invitee.id)}
                            className="w-4 h-4 rounded text-[#b05570] accent-[#b05570] cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="font-display font-bold text-sm text-[#4a3038] truncate">
                              {invitee.name}
                            </p>
                            <p className="text-[11px] text-[#7a4d5d] truncate flex items-center gap-2">
                              <span>{invitee.phone || 'No phone'}</span>
                              <span>•</span>
                              <span className="font-mono text-gray-400">/{invitee.slug}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isSent ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Sent</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              Unsent
                            </span>
                          )}

                          <button
                            onClick={() => handleCopyMessage(invitee)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#4a3038] hover:bg-gray-100 transition cursor-pointer"
                            title="Copy personalized WhatsApp message"
                          >
                            {copiedId === invitee.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => sendWhatsApp(invitee)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                            title="Open WhatsApp for this guest"
                          >
                            <Send className="w-3.5 h-3.5 fill-current" />
                            <span className="hidden sm:inline">Send</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#fffafc] px-5 sm:px-6 py-3.5 border-t border-[#e08aa3]/20 flex items-center justify-between text-xs text-[#7a4d5d]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#b05570] shrink-0" />
            <span>
              Each click opens WhatsApp with that guest&apos;s direct personalized invitation link and name prefilled.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#4a3038] font-semibold transition cursor-pointer shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
