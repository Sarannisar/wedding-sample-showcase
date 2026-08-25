import React, { useEffect, useState } from 'react';
import { fetchInvitees, createInvitee, deleteInvitee } from '@/lib/supabase';
import { Invitee } from '@/lib/types';
import { weddingConfig } from '@/config/weddingConfig';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { AllInviteesTab } from '@/components/dashboard/AllInviteesTab';
import { AddImportTab } from '@/components/dashboard/AddImportTab';
import { LayoutDashboard, Users, UserPlus, Sparkles } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'add'>('overview');
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchInvitees();
    setInvitees(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddInvitee = async (name: string, phone?: string | null) => {
    const newInvitee = await createInvitee(name, phone);
    setInvitees((prev) => [newInvitee, ...prev]);
    return newInvitee;
  };

  const handleBulkAdd = async (rows: { name: string; phone?: string }[]) => {
    for (const row of rows) {
      await createInvitee(row.name, row.phone);
    }
    await loadData();
  };

  const handleDeleteInvitee = async (id: string) => {
    await deleteInvitee(id);
    setInvitees((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#fdf9f5] flex flex-col text-[#2d1a22]">
      {/* Dark Theme Header Bar as specified in template */}
      <header className="bg-[#7d334a] text-white py-4 px-4 sm:px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Left: Event & Honorees */}
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[#e8a4b4]">🌸</span>
              <span className="font-label text-xs uppercase tracking-widest text-[#e8a4b4] font-semibold">
                {weddingConfig.event.label}
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              {weddingConfig.couple.groom} & {weddingConfig.couple.bride}
            </h1>
          </div>

          {/* Right: Event Date & Badge */}
          <div className="text-center sm:text-right">
            <span className="font-label text-xs uppercase tracking-wider text-[#e8a4b4] block">
              Wedding Date
            </span>
            <p className="font-display text-sm font-medium">
              {weddingConfig.event.dayAndDate}
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#b05570]/20 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#b05570] text-white shadow'
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
                ? 'bg-[#b05570] text-white shadow'
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
                ? 'bg-[#b05570] text-white shadow'
                : 'text-gray-600 hover:bg-white/80'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add & Import</span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center text-[#9a7080] font-body flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6 animate-spin text-[#b05570]" />
            <span>Loading dashboard data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab invitees={invitees} />}
            {activeTab === 'all' && (
              <AllInviteesTab invitees={invitees} onDelete={handleDeleteInvitee} />
            )}
            {activeTab === 'add' && (
              <AddImportTab
                onAddInvitee={handleAddInvitee}
                onBulkAddInvitees={handleBulkAdd}
              />
            )}
          </>
        )}
      </main>

      {/* Dashboard Footer */}
      <footer className="py-4 border-t border-[#b05570]/10 text-center text-xs text-[#9a7080] font-body">
        Wedding Invitation Management System • Sharrafuth & Safiyya
      </footer>
    </div>
  );
};
