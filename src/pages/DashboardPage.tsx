import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchInvitees,
  createInvitee,
  createBulkInvitees,
  deleteInvitee,
  deleteBulkInvitees,
  markInviteeShared,
  updateInvitee,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import { Invitee } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { AllInviteesTab } from '@/components/dashboard/AllInviteesTab';
import { AddImportTab } from '@/components/dashboard/AddImportTab';
import { LayoutDashboard, Users, UserPlus, Sparkles, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'add'>('overview');
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetInviteeId, setTargetInviteeId] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    const data = await fetchInvitees();
    setInvitees(data);
    if (!isSilent) setLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime channel subscription
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('dashboard-realtime-invitees')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'invitees' },
          () => {
            void loadData(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Periodic fallback sync every 15 seconds
      const timer = setInterval(() => {
        void loadData(true);
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [loadData]);

  const handleAddInvitee = async (name: string, phone?: string | null) => {
    const newInvitee = await createInvitee(name, phone);
    setInvitees((prev) => [newInvitee, ...prev]);
    return newInvitee;
  };

  const handleBulkAdd = async (rows: { name: string; phone?: string }[]) => {
    const newItems = await createBulkInvitees(rows);
    setInvitees((prev) => [...newItems, ...prev]);
    await loadData(true);
  };

  const handleDeleteInvitee = async (id: string) => {
    await deleteInvitee(id);
    setInvitees((prev) => prev.filter((i) => i.id !== id));
  };

  const handleBulkDelete = async (ids: string[]) => {
    await deleteBulkInvitees(ids);
    setInvitees((prev) => prev.filter((i) => !ids.includes(i.id)));
  };

  const handleMarkShared = async (id: string) => {
    const sharedAt = await markInviteeShared(id);
    setInvitees((prev) =>
      prev.map((i) => (i.id === id ? { ...i, shared_at: sharedAt } : i))
    );
  };

  const handleBulkMarkShared = async (ids: string[]) => {
    for (const id of ids) {
      await handleMarkShared(id);
    }
  };

  const handleUpdateInvitee = async (
    id: string,
    updates: Partial<Pick<Invitee, 'name' | 'phone' | 'notes' | 'rsvp' | 'guest_count' | 'responded_at'>>
  ) => {
    const success = await updateInvitee(id, updates);
    if (!success) return;
    setInvitees((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...updates };
        if (updates.rsvp === 'pending') {
          next.responded_at = null;
          next.guest_count = 0;
        }
        return next;
      })
    );
  };

  const handleNavigateToAll = (targetId?: string) => {
    setActiveTab('all');
    if (targetId) {
      setTargetInviteeId(targetId);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffafc] flex flex-col text-[#4a3038]">
      {/* Dark Theme Header Bar as specified in template */}
      <header className="bg-[#b05570] text-white py-4 px-4 sm:px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Left: Event & Honorees */}
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[#f7c1d0]">🌸</span>
              <span className="font-label text-xs uppercase tracking-widest text-[#f7c1d0] font-semibold">
                {weddingConfig.event.label}
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              {weddingConfig.couple.bride} & {weddingConfig.couple.groom}
            </h1>
          </div>

          {/* Right: Event Date & Refresh Button */}
          <div className="flex items-center gap-4 text-center sm:text-right">
            <div>
              <span className="font-label text-xs uppercase tracking-wider text-[#f7c1d0] block">
                Wedding Date
              </span>
              <p className="font-display text-sm font-medium">
                {weddingConfig.event.dayAndDate}
              </p>
            </div>
            <button
              onClick={() => void loadData(true)}
              disabled={refreshing || loading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#e08aa3]/20 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#e08aa3] text-white shadow'
                : 'text-gray-600 hover:bg-white/80'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#e08aa3] text-white shadow'
                : 'text-gray-600 hover:bg-white/80'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Invitees ({invitees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-[#e08aa3] text-white shadow'
                : 'text-gray-600 hover:bg-white/80'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add & Import</span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center text-[#b592a0] font-body flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6 animate-spin text-[#e08aa3]" />
            <span>Loading dashboard data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab invitees={invitees} />}
            {activeTab === 'all' && (
              <AllInviteesTab
                invitees={invitees}
                targetInviteeId={targetInviteeId}
                onClearTargetInviteeId={() => setTargetInviteeId(null)}
                onDelete={handleDeleteInvitee}
                onBulkDelete={handleBulkDelete}
                onMarkShared={handleMarkShared}
                onBulkMarkShared={handleBulkMarkShared}
                onUpdateInvitee={handleUpdateInvitee}
              />
            )}
            {activeTab === 'add' && (
              <AddImportTab
                existingInvitees={invitees}
                onAddInvitee={handleAddInvitee}
                onBulkAddInvitees={handleBulkAdd}
                onNavigateToAll={handleNavigateToAll}
              />
            )}
          </>
        )}
      </main>

      {/* Dashboard Footer */}
      <footer className="py-4 border-t border-[#e08aa3]/10 text-center text-xs text-[#b592a0] font-body">
        Wedding Invitation Management System • Safiyya & Sharrafuth
      </footer>
    </div>
  );
};
