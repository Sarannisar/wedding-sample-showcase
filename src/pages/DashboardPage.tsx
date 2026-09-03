import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchInvitees,
  createInvitee,
  createBulkInvitees,
  deleteInvitee,
  deleteBulkInvitees,
  restoreInvitee,
  restoreBulkInvitees,
  markInviteeShared,
  markBulkInviteesShared,
  updateInvitee,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import { Invitee } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { AllInviteesTab } from '@/components/dashboard/AllInviteesTab';
import { AddImportTab } from '@/components/dashboard/AddImportTab';
import { notify } from '@/lib/notify';
import { exportDatabaseSnapshot } from '@/lib/backupHelper';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  RefreshCw,
  Download,
} from 'lucide-react';

type ConnectionStatus = 'live' | 'polling' | 'offline';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'add'>('overview');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attending' | 'declined' | 'pending' | 'opened_unresponded' | 'notsent'>('all');
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetInviteeId, setTargetInviteeId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    isSupabaseConfigured ? 'connecting' as any : 'polling'
  );

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchInvitees();
      setInvitees(data);
    } catch (err) {
      console.error('Failed to load invitees:', err);
      notify.error('Could not refresh guest list.');
    } finally {
      if (!isSilent) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  const connectionStatusRef = React.useRef<ConnectionStatus>(
    isSupabaseConfigured ? 'connecting' as any : 'polling'
  );

  const updateStatus = (status: ConnectionStatus) => {
    connectionStatusRef.current = status;
    setConnectionStatus(status);
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime channel subscription with status tracking
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            updateStatus('live');
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            updateStatus('polling');
          } else if (status === 'CLOSED') {
            updateStatus('offline');
          }
        });

      // Fallback polling interval in case realtime is interrupted
      const fallbackInterval = setInterval(() => {
        if (connectionStatusRef.current === 'polling') {
          void loadData(true);
        }
      }, 15000);

      return () => {
        if (supabase) supabase.removeChannel(channel);
        clearInterval(fallbackInterval);
      };
    } else {
      updateStatus('polling');
      const timer = setInterval(() => {
        void loadData(true);
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [loadData]);

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      if (isSupabaseConfigured) setConnectionStatus('live');
      else setConnectionStatus('polling');
      void loadData(true);
    };
    const handleOffline = () => {
      setConnectionStatus('offline');
      notify.info('You are offline. Dashboard changes will sync when connected.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  const handleRestoreInvitee = async (invitee: Invitee) => {
    await restoreInvitee(invitee);
    setInvitees((prev) => {
      if (prev.some((i) => i.id === invitee.id)) return prev;
      return [invitee, ...prev];
    });
  };

  const handleBulkRestore = async (restoredList: Invitee[]) => {
    const success = await restoreBulkInvitees(restoredList);
    if (success) {
      setInvitees((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const toAdd = restoredList.filter((i) => !existingIds.has(i.id));
        return [...toAdd, ...prev];
      });
      notify.success(`Restored ${restoredList.length} invitees`);
    } else {
      notify.error('Failed to restore invitees. Please try again.');
    }
  };

  const handleMarkShared = async (id: string) => {
    const sharedAt = await markInviteeShared(id);
    setInvitees((prev) =>
      prev.map((i) => (i.id === id ? { ...i, shared_at: sharedAt } : i))
    );
  };

  const handleBulkMarkShared = async (ids: string[]) => {
    const sharedAt = await markBulkInviteesShared(ids);
    if (sharedAt) {
      const idSet = new Set(ids);
      setInvitees((prev) =>
        prev.map((i) => (idSet.has(i.id) ? { ...i, shared_at: sharedAt } : i))
      );
      notify.success(`Marked ${ids.length} invitees as sent`);
    } else {
      notify.error('Failed to mark invitees as sent. Please try again.');
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
      {/* Header Bar */}
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

          {/* Right: Realtime status & Refresh Button */}
          <div className="flex items-center gap-4 text-center sm:text-right">
            <div>
              <span className="font-label text-xs uppercase tracking-wider text-[#f7c1d0] block">
                Wedding Date
              </span>
              <p className="font-display text-sm font-medium">
                {weddingConfig.event.dayAndDate}
              </p>
            </div>

            {/* Connection Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 text-[11px] font-label font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'live'
                    ? 'bg-emerald-400 animate-pulse'
                    : connectionStatus === 'polling'
                    ? 'bg-amber-300'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-white/90">
                {connectionStatus === 'live'
                  ? 'Live'
                  : connectionStatus === 'polling'
                  ? 'Auto-syncing'
                  : 'Offline'}
              </span>
            </div>

            {/* 1-Click JSON Snapshot Backup */}
            <button
              onClick={() => exportDatabaseSnapshot(invitees)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold transition cursor-pointer border border-white/20"
              title="Download Complete Offline JSON Backup of Wedding Database"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup (JSON)</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={() => {
                void loadData(true);
                notify.info('Refreshing guest list...');
              }}
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

        {/* Tab Content with Skeleton Loading (Step 16 #27) */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {/* Skeleton Stat Cards */}
            {/* Skeleton Quick Action Bar */}
            <div className="h-16 rounded-2xl bg-white/70 border border-[#e08aa3]/10 p-4 flex items-center justify-between animate-pulse">
              <div className="space-y-1.5">
                <div className="h-4 bg-[#e08aa3]/20 rounded w-44" />
                <div className="h-2.5 bg-[#e08aa3]/10 rounded w-64" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 bg-[#e08aa3]/15 rounded-xl w-20" />
                <div className="h-8 bg-[#e08aa3]/15 rounded-xl w-24" />
              </div>
            </div>

            {/* Skeleton 3 Primary Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl bg-white/70 border border-[#e08aa3]/15 p-6 flex flex-col justify-between"
                >
                  <div className="h-3 bg-[#e08aa3]/20 rounded w-24" />
                  <div className="h-9 bg-[#e08aa3]/25 rounded w-16" />
                  <div className="h-2 bg-[#e08aa3]/10 rounded w-full" />
                </div>
              ))}
            </div>

            {/* Skeleton 4 Secondary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-white/70 border border-[#e08aa3]/10 p-4 flex flex-col justify-between"
                >
                  <div className="h-2.5 bg-[#e08aa3]/15 rounded w-20" />
                  <div className="h-6 bg-[#e08aa3]/20 rounded w-12" />
                  <div className="h-2 bg-[#e08aa3]/10 rounded w-16" />
                </div>
              ))}
            </div>

            {/* Skeleton Donut & Progress Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
              <div className="h-40 rounded-2xl bg-white/70 border border-[#e08aa3]/10 p-5 flex items-center gap-5">
                <div className="w-28 h-28 rounded-full border-8 border-[#e08aa3]/20 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-[#e08aa3]/15 rounded w-32" />
                  <div className="h-2.5 bg-[#e08aa3]/10 rounded w-48" />
                  <div className="h-2.5 bg-[#e08aa3]/10 rounded w-40" />
                </div>
              </div>
              <div className="h-40 rounded-2xl bg-white/70 border border-[#e08aa3]/10 p-5 space-y-3">
                <div className="h-4 bg-[#e08aa3]/20 rounded w-36" />
                <div className="h-2.5 bg-[#e08aa3]/10 rounded w-full" />
                <div className="h-2.5 bg-[#e08aa3]/10 rounded w-5/6" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                invitees={invitees}
                onNavigateToAdd={() => setActiveTab('add')}
                onFilterClick={(filter) => {
                  setStatusFilter(filter);
                  setActiveTab('all');
                }}
                onGuestClick={(guestId) => {
                  setTargetInviteeId(guestId);
                  setActiveTab('all');
                }}
              />
            )}
            {activeTab === 'all' && (
              <AllInviteesTab
                invitees={invitees}
                targetInviteeId={targetInviteeId}
                onClearTargetInviteeId={() => setTargetInviteeId(null)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onDelete={handleDeleteInvitee}
                onBulkDelete={handleBulkDelete}
                onRestore={handleRestoreInvitee}
                onBulkRestore={handleBulkRestore}
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
