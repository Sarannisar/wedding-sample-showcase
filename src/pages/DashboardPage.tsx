import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  markInviteeReminded,
  markBulkInviteesReminded,
  updateInvitee,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import { Invitee } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { AllInviteesTab, ChipFilter } from '@/components/dashboard/AllInviteesTab';
import { AddImportTab } from '@/components/dashboard/AddImportTab';
import { MemoriesTab } from '@/components/dashboard/MemoriesTab';
import { WeddingEvent } from '@/lib/memoriesTypes';
import { fetchWeddingEvent } from '@/lib/memoriesService';
import { notify } from '@/lib/notify';
import { exportDatabaseSnapshot } from '@/lib/backupHelper';
import { formatRelativeTime } from '@/lib/utils';
import { DashboardLogin } from '@/components/dashboard/DashboardLogin';
import { isSessionExpired, signOutAdmin, ADMIN_NAME } from '@/lib/dashboardAuth';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  RefreshCw,
  Download,
  LogOut,
  ShieldCheck,
  Camera,
  Sun,
  Moon,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'add' | 'memories'>('overview');
  const [weddingEvent, setWeddingEvent] = useState<WeddingEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'polling' | 'offline'>('polling');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [targetInviteeId, setTargetInviteeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ChipFilter>('all');
  const [openReminderQueue, setOpenReminderQueue] = useState(false);
  const [openBulkSenderQueue, setOpenBulkSenderQueue] = useState(false);

  // Dark Mode State (Theme Velvet & Rose Gold)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dashboard_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dashboard_theme', next ? 'dark' : 'light');
      } catch {
        // Ignore storage exceptions
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dashboard-dark');
    } else {
      document.body.classList.remove('dashboard-dark');
    }
    return () => {
      document.body.classList.remove('dashboard-dark');
    };
  }, [isDarkMode]);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Verify Supabase Auth session and enforce 5-day / 30-day session expiry
  useEffect(() => {
    let mounted = true;

    const verifyAuth = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) {
          setIsAuthenticated(true);
          setIsAuthChecking(false);
        }
        return;
      }

      // Check if session has exceeded custom lifetime
      if (isSessionExpired()) {
        await signOutAdmin();
        if (mounted) {
          setIsAuthenticated(false);
          setIsAuthChecking(false);
          notify.info('Your session has expired. Please enter your password to continue.');
        }
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setIsAuthenticated(Boolean(data.session));
          setIsAuthChecking(false);
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false);
          setIsAuthChecking(false);
        }
      }
    };

    void verifyAuth();

    const { data: authListener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (!session) {
          setIsAuthenticated(false);
        } else if (isSessionExpired()) {
          void signOutAdmin();
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      }
    }) || { data: { subscription: null } };

    return () => {
      mounted = false;
      authListener.subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOutAdmin();
    setIsAuthenticated(false);
    notify.info('Logged out of dashboard.');
  };

  // Sync ref to avoid stale closure inside realtime event handlers
  const connectionStatusRef = useRef(connectionStatus);
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const refreshInvitees = useCallback(async () => {
    try {
      const data = await fetchInvitees();
      setInvitees(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Failed to refresh invitees:', err);
    }
  }, []);

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await fetchInvitees();
      setInvitees(data);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Error fetching invitees:', err);
      notify.error('Could not load invitees. Operating in local mode.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      void loadData();
      void fetchWeddingEvent(weddingConfig.defaultEventSlug).then(setWeddingEvent);
    }
  }, [isAuthenticated, loadData]);

  // Set up Supabase Realtime subscription when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateStatus = (status: 'live' | 'polling' | 'offline') => {
      setConnectionStatus(status);
    };

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('dashboard-invitees-realtime')
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
  }, [isAuthenticated, loadData]);

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
    const prev = invitees;
    setInvitees((curr) => curr.filter((i) => i.id !== id));
    const ok = await deleteInvitee(id);
    if (!ok) {
      setInvitees(prev);
      notify.error('Could not delete invitee. Refreshing from the server…');
      await refreshInvitees();
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    const prev = invitees;
    const idSet = new Set(ids);
    setInvitees((curr) => curr.filter((i) => !idSet.has(i.id)));
    const ok = await deleteBulkInvitees(ids);
    if (!ok) {
      setInvitees(prev);
      notify.error('Could not delete invitees. Refreshing from the server…');
      await refreshInvitees();
    }
  };

  const handleRestoreInvitee = async (invitee: Invitee) => {
    const prev = invitees;
    setInvitees((curr) => (curr.some((i) => i.id === invitee.id) ? curr : [invitee, ...curr]));
    const ok = await restoreInvitee(invitee);
    if (!ok) {
      setInvitees(prev);
      notify.error('Could not restore invitee. Refreshing from the server…');
      await refreshInvitees();
    }
  };

  const handleBulkRestore = async (restoredList: Invitee[]) => {
    const prev = invitees;
    const existingIds = new Set(prev.map((i) => i.id));
    const toAdd = restoredList.filter((i) => !existingIds.has(i.id));
    setInvitees([...toAdd, ...prev]);

    const ok = await restoreBulkInvitees(restoredList);
    if (!ok) {
      setInvitees(prev);
      notify.error('Could not restore invitees. Refreshing from the server…');
      await refreshInvitees();
    } else {
      notify.success(`Restored ${restoredList.length} invitees`);
    }
  };

  const handleMarkShared = async (id: string) => {
    const prev = invitees;
    const optimisticTime = new Date().toISOString();
    setInvitees((curr) =>
      curr.map((i) => (i.id === id ? { ...i, shared_at: optimisticTime } : i))
    );
    const sharedAt = await markInviteeShared(id);
    if (!sharedAt) {
      setInvitees(prev);
      notify.error('Could not mark invitee as sent. Refreshing from the server…');
      await refreshInvitees();
    } else {
      setInvitees((curr) =>
        curr.map((i) => (i.id === id ? { ...i, shared_at: sharedAt } : i))
      );
    }
  };

  const handleBulkMarkShared = async (ids: string[]) => {
    const prev = invitees;
    const idSet = new Set(ids);
    const optimisticTime = new Date().toISOString();
    setInvitees((curr) =>
      curr.map((i) => (idSet.has(i.id) ? { ...i, shared_at: optimisticTime } : i))
    );
    const sharedAt = await markBulkInviteesShared(ids);
    if (!sharedAt) {
      setInvitees(prev);
      notify.error('Failed to mark invitees as sent. Refreshing from the server…');
      await refreshInvitees();
    } else {
      setInvitees((curr) =>
        curr.map((i) => (idSet.has(i.id) ? { ...i, shared_at: sharedAt } : i))
      );
      notify.success(`Marked ${ids.length} invitees as sent`);
    }
  };

  const handleRemindInvitee = async (id: string) => {
    const prev = invitees;
    const optimisticTime = new Date().toISOString();
    setInvitees((curr) =>
      curr.map((i) =>
        i.id === id
          ? {
              ...i,
              reminded_at: optimisticTime,
              reminder_count: (i.reminder_count || 0) + 1,
            }
          : i
      )
    );
    const ok = await markInviteeReminded(id);
    if (!ok) {
      setInvitees(prev);
      notify.error('Could not record reminder. Refreshing from the server…');
      await refreshInvitees();
      return false;
    }
    return true;
  };

  const handleBulkRemind = async (ids: string[]) => {
    const prev = invitees;
    const idSet = new Set(ids);
    const optimisticTime = new Date().toISOString();
    setInvitees((curr) =>
      curr.map((i) =>
        idSet.has(i.id)
          ? {
              ...i,
              reminded_at: optimisticTime,
              reminder_count: (i.reminder_count || 0) + 1,
            }
          : i
      )
    );
    const ok = await markBulkInviteesReminded(ids);
    if (!ok) {
      setInvitees(prev);
      notify.error('Failed to record some reminders. Refreshing from the server…');
      await refreshInvitees();
      return false;
    }
    return true;
  };

  const handleUpdateInvitee = async (
    id: string,
    updates: Partial<Pick<Invitee, 'name' | 'phone' | 'notes' | 'rsvp' | 'guest_count' | 'responded_at'>>
  ) => {
    const prev = invitees;
    setInvitees((curr) =>
      curr.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...updates };
        if (updates.rsvp === 'pending') {
          next.responded_at = null;
          next.guest_count = 0;
        }
        return next;
      })
    );
    const ok = await updateInvitee(id, updates);
    if (!ok) {
      setInvitees(prev);
      notify.error('Could not save guest changes. Refreshing from the server…');
      await refreshInvitees();
    }
  };

  const handleNavigateToAll = (targetId?: string) => {
    setActiveTab('all');
    if (targetId) {
      setTargetInviteeId(targetId);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-[#fffafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#e08aa3]/30 border-t-[#e08aa3] animate-spin" />
          <span className="font-label text-xs uppercase tracking-widest text-[#b592a0]">
            Verifying Host Security...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <DashboardLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'dashboard-dark bg-[#482a3c] text-[#fff6f9]' : 'bg-[#fffafc] text-[#4a3038]'
      }`}
    >
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
          <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-right flex-wrap justify-center">
            <div>
              <span className="font-label text-xs uppercase tracking-wider text-[#f7c1d0] block">
                Wedding Date
              </span>
              <p className="font-display text-sm font-medium">
                {weddingConfig.event.dayAndDate}
              </p>
            </div>

            {/* Connection Status Badge & Last Synced Timestamp */}
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
                {connectionStatus === 'offline'
                  ? 'Offline'
                  : `Synced ${formatRelativeTime(lastSyncedAt.toISOString())}`}
              </span>
            </div>

            {/* Host Identity Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/20 text-white text-xs font-label">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f7c1d0]" />
              <span>Host: <strong>{ADMIN_NAME}</strong></span>
            </div>

            {/* Theme Toggle (Dark / Light Mode) */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-semibold transition cursor-pointer border border-white/20"
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Midnight Velvet Dark Theme'}
              aria-label="Toggle theme mode"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#f7c1d0]" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

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
              disabled={isRefreshing || isLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Log Out button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600/90 active:scale-95 text-white text-xs font-semibold transition cursor-pointer border border-white/20"
              title="Log Out of Dashboard"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
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

          <button
            onClick={() => setActiveTab('memories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'memories'
                ? 'bg-[#e08aa3] text-white shadow'
                : 'text-gray-600 hover:bg-white/80'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Memories</span>
          </button>
        </div>

        {/* Tab Content with Skeleton Loading (Step 16 #27) */}
        {isLoading ? (
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
                  className="h-20 rounded-2xl bg-white/70 border border-[#e08aa3]/10 p-4 flex flex-col justify-between"
                >
                  <div className="h-2.5 bg-[#e08aa3]/15 rounded w-20" />
                  <div className="h-6 bg-[#e08aa3]/20 rounded w-12" />
                </div>
              ))}
            </div>

            {/* Donut & Recent Activity Skeleton matching 12-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
              <div className="lg:col-span-5 h-72 rounded-2xl bg-white/70 border border-[#e08aa3]/10 p-5 flex flex-col items-center justify-center gap-4">
                <div className="w-32 h-32 rounded-full bg-[#e08aa3]/15 shrink-0" />
                <div className="space-y-2 w-full max-w-xs">
                  <div className="h-3 bg-[#e08aa3]/20 rounded w-3/4 mx-auto" />
                  <div className="h-2.5 bg-[#e08aa3]/10 rounded w-1/2 mx-auto" />
                </div>
              </div>
              <div className="lg:col-span-7 h-72 rounded-2xl bg-white/70 border border-[#e08aa3]/10 p-5 space-y-4">
                <div className="h-4 bg-[#e08aa3]/20 rounded w-44" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-[#e08aa3]/10 rounded-xl w-full" />
                  ))}
                </div>
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
                onRemindAll={() => {
                  setActiveTab('all');
                  setOpenReminderQueue(true);
                }}
                onOpenBulkSender={() => {
                  setActiveTab('all');
                  setOpenBulkSenderQueue(true);
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
                onRemindInvitee={handleRemindInvitee}
                onBulkRemind={handleBulkRemind}
                openReminderQueue={openReminderQueue}
                onResetReminderQueue={() => setOpenReminderQueue(false)}
                openBulkSenderQueue={openBulkSenderQueue}
                onResetBulkSenderQueue={() => setOpenBulkSenderQueue(false)}
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
            {activeTab === 'memories' && weddingEvent && (
              <MemoriesTab
                event={weddingEvent}
                onEventUpdated={setWeddingEvent}
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
