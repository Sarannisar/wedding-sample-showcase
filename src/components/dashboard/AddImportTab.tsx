import React, { useState } from 'react';
import { Invitee } from '@/lib/types';
import { parseCsvContent, SAMPLE_CSV_CONTENT } from '@/lib/csvHelper';
import { validateBackupJson } from '@/lib/backupHelper';
import { formatPhoneNumber } from '@/lib/utils';
import { fetchInvitees } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import {
  UserPlus,
  Upload,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  X,
  Users,
  CheckSquare,
} from 'lucide-react';

interface AddImportTabProps {
  existingInvitees?: Invitee[];
  onAddInvitee: (name: string, phone?: string | null) => Promise<Invitee>;
  onBulkAddInvitees: (rows: { name: string; phone?: string }[]) => Promise<void>;
  onNavigateToAll?: (targetId?: string) => void;
}

type StagedRowStatus = 'new' | 'duplicate' | 'invalid';

interface StagedCsvRow {
  id: string;
  name: string;
  phone?: string;
  status: StagedRowStatus;
  reason?: string;
  selected: boolean;
}

function normalizeDigits(val?: string | null): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

function isSameContact(
  nameA: string,
  phoneA: string | undefined | null,
  nameB: string,
  phoneB: string | undefined | null
): boolean {
  const cleanNameA = nameA.trim().toLowerCase();
  const cleanNameB = nameB.trim().toLowerCase();
  if (cleanNameA !== cleanNameB) return false;

  const digitsA = normalizeDigits(phoneA);
  const digitsB = normalizeDigits(phoneB);

  if (digitsA && digitsB) {
    return digitsA === digitsB;
  }
  if (!digitsA && !digitsB) {
    return true;
  }
  return digitsA === digitsB;
}

export const AddImportTab: React.FC<AddImportTabProps> = ({
  existingInvitees = [],
  onAddInvitee,
  onBulkAddInvitees,
  onNavigateToAll,
}) => {
  // Single Invitee State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvitee, setCreatedInvitee] = useState<Invitee | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Single Invitee Duplicate Modal State
  const [showSingleDuplicateModal, setShowSingleDuplicateModal] = useState(false);
  const [singleDuplicateInvitee, setSingleDuplicateInvitee] = useState<Invitee | null>(null);
  const [copiedDuplicateLink, setCopiedDuplicateLink] = useState(false);

  // Staged CSV Preview State
  const [stagedRows, setStagedRows] = useState<StagedCsvRow[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommittingImport, setIsCommittingImport] = useState(false);

  const handleSingleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);

      // Check current list for duplicates
      const currentList =
        existingInvitees.length > 0 ? existingInvitees : await fetchInvitees();
      const duplicate = currentList.find((inv) =>
        isSameContact(inv.name, inv.phone, name, formattedPhone)
      );

      if (duplicate) {
        setSingleDuplicateInvitee(duplicate);
        setShowSingleDuplicateModal(true);
        notify.info(`Guest "${name}" is already in your guest list.`);
        setIsSubmitting(false);
        return;
      }

      const result = await onAddInvitee(name, formattedPhone);
      setCreatedInvitee(result);
      setName('');
      setPhone('');
      notify.success(`Created invitation link for ${result.name}!`);
    } catch (err) {
      console.error('Failed to create invitee:', err);
      notify.error('Failed to create invitation link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdInvitee) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/invite/${createdInvitee.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    notify.success('Copied invitation link to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const isJson = file.name.toLowerCase().endsWith('.json');

    const reader = new FileReader();

    reader.onerror = () => {
      notify.error('Error reading the uploaded file. Please try again.');
      setIsUploading(false);
      if (e.target) e.target.value = '';
    };

    reader.onabort = () => {
      notify.error('File upload was cancelled.');
      setIsUploading(false);
      if (e.target) e.target.value = '';
    };

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: { name: string; phone?: string }[] = [];

        if (isJson) {
          const validated = validateBackupJson(text);
          if (!validated.success || !validated.invitees) {
            notify.error(validated.error || 'Invalid JSON backup file.');
            setIsUploading(false);
            return;
          }
          parsed = validated.invitees.map((i) => ({
            name: i.name,
            phone: i.phone || undefined,
          }));
          notify.info(`Extracted ${parsed.length} guests from JSON backup for review.`);
        } else {
          parsed = parseCsvContent(text);
        }

        if (parsed.length === 0) {
          notify.error('No valid guest rows found in the uploaded file.');
          setIsUploading(false);
          return;
        }

        const currentDbList =
          existingInvitees.length > 0 ? existingInvitees : await fetchInvitees();

        // Pre-index database contacts for O(1) lookup
        const dbNamePhoneSet = new Set(
          currentDbList.map(
            (inv) => `${inv.name.trim().toLowerCase()}::${normalizeDigits(inv.phone)}`
          )
        );

        const staged: StagedCsvRow[] = [];
        const seenInFile = new Set<string>();
        const CHUNK_SIZE = 100;

        for (let i = 0; i < parsed.length; i++) {
          if (i > 0 && i % CHUNK_SIZE === 0) {
            // Yield to event loop to keep UI thread responsive on large files
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          const row = parsed[i];
          const rowName = row.name ? row.name.trim() : '';
          const formattedPhone = formatPhoneNumber(row.phone) || undefined;
          const id = `staged-${i}-${Date.now()}`;

          // 1. Invalid Check
          if (!rowName) {
            staged.push({
              id,
              name: '(Empty name)',
              phone: formattedPhone,
              status: 'invalid',
              reason: 'Missing name',
              selected: false,
            });
            continue;
          }

          const fileKey = `${rowName.toLowerCase()}::${normalizeDigits(formattedPhone)}`;

          // 2. Duplicate against database (O(1) Set lookup)
          if (dbNamePhoneSet.has(fileKey)) {
            staged.push({
              id,
              name: rowName,
              phone: formattedPhone,
              status: 'duplicate',
              reason: 'Already in guest list',
              selected: false,
            });
            continue;
          }

          // 3. Duplicate within CSV (O(1) Set lookup)
          if (seenInFile.has(fileKey)) {
            staged.push({
              id,
              name: rowName,
              phone: formattedPhone,
              status: 'duplicate',
              reason: 'Duplicate in this CSV',
              selected: false,
            });
            continue;
          }

          seenInFile.add(fileKey);

          // 4. Valid New Row
          staged.push({
            id,
            name: rowName,
            phone: formattedPhone,
            status: 'new',
            selected: true,
          });
        }

        setStagedRows(staged);
        const newCount = staged.filter((r) => r.status === 'new').length;
        const dupCount = staged.filter((r) => r.status === 'duplicate').length;
        notify.info(`Parsed ${staged.length} rows: ${newCount} new, ${dupCount} duplicates.`);
      } catch (err) {
        console.error('CSV Parsing error:', err);
        notify.error('Could not parse the CSV file. Please check format.');
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const toggleStagedRow = (id: string) => {
    if (!stagedRows) return;
    setStagedRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)) : null
    );
  };

  const toggleSelectAllNew = (select: boolean) => {
    if (!stagedRows) return;
    setStagedRows((prev) =>
      prev
        ? prev.map((r) =>
            r.status === 'new' ? { ...r, selected: select } : r
          )
        : null
    );
  };

  const commitStagedImport = async () => {
    if (!stagedRows) return;
    const selectedToImport = stagedRows.filter((r) => r.selected && r.status !== 'invalid');

    if (selectedToImport.length === 0) {
      notify.info('No guests selected for import.');
      return;
    }

    setIsCommittingImport(true);
    try {
      const rows = selectedToImport.map((r) => ({
        name: r.name,
        phone: r.phone,
      }));

      await onBulkAddInvitees(rows);
      notify.success(`Successfully imported ${selectedToImport.length} guests!`);
      setStagedRows(null);
      onNavigateToAll?.();
    } catch (err) {
      console.error('Import commit error:', err);
      notify.error('Failed to import some guests. Please try again.');
    } finally {
      setIsCommittingImport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Add Single Invitee */}
        <div className="bg-white rounded-2xl p-6 border border-[#e08aa3]/15 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 text-[#b05570]">
              <UserPlus className="w-5 h-5" />
              <h4 className="font-display text-lg font-bold">Add Single Invitee</h4>
            </div>
            <p className="font-body text-xs text-[#b592a0] mb-6">
              Create an individual personalized wedding invitation link.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block font-label text-xs uppercase tracking-wider text-[#4a3038] font-semibold mb-1">
                  Guest / Family Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mohammed & Family"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3]"
                />
              </div>

              <div>
                <label className="block font-label text-xs uppercase tracking-wider text-[#4a3038] font-semibold mb-1">
                  WhatsApp Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0771234567 or +447123456789"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    const sanitized = val.startsWith('+')
                      ? '+' + val.substring(1).replace(/\D/g, '')
                      : val.replace(/\D/g, '');
                    setPhone(sanitized);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3]"
                />
                <span className="text-[11px] text-[#b592a0] mt-1 block">
                  Numbers without <code>+</code> auto-format to <code>+94</code>. Non-Sri Lankan numbers can start with <code>+</code> (e.g. <code>+44...</code>, <code>+971...</code>).
                </span>
              </div>

              <button
                onClick={handleSingleSubmit}
                disabled={!name.trim() || isSubmitting}
                className="w-full py-3 px-6 rounded-xl bg-[#e08aa3] text-white font-label text-xs uppercase tracking-wider font-semibold shadow hover:bg-[#b05570] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Checking & Generating...' : 'Create Invitation Link'}
              </button>
            </div>
          </div>

          {/* Success Generated Box */}
          {createdInvitee && (
            <div className="p-4 rounded-xl bg-[#fdf7f9] border border-[#e08aa3]/25 space-y-2 mt-4">
              <span className="font-label text-xs uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Link Generated for {createdInvitee.name}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${createdInvitee.slug}`}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-700"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-lg bg-[#e08aa3] text-white hover:bg-[#b05570] transition-colors cursor-pointer"
                  title="Copy Link"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {createdInvitee.phone && (
                <p className="text-[11px] text-[#b05570]">
                  Saved WhatsApp number: <strong>{createdInvitee.phone}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: CSV Bulk Import */}
        <div className="bg-white rounded-2xl p-6 border border-[#e08aa3]/15 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2 text-[#b05570]">
            <Upload className="w-5 h-5" />
            <h4 className="font-display text-lg font-bold">Bulk CSV &amp; Backup Import</h4>
          </div>
          <p className="font-body text-xs text-[#b592a0]">
            Upload a spreadsheet (CSV) or JSON database backup file to review, resolve conflicts, and stage guests before adding.
          </p>

          {/* Dashed Upload Area */}
          <label className="relative border-2 border-dashed border-[#e08aa3]/30 hover:border-[#e08aa3] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#fdfafb]/50">
            <input
              type="file"
              accept=".csv,text/csv,.json,application/json"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <FileText className="w-10 h-10 text-[#e08aa3]/60 mb-2" />
            <span className="font-label text-xs uppercase tracking-wider text-[#4a3038] font-semibold">
              {isUploading ? 'Parsing File...' : 'Click to Upload CSV or JSON Backup'}
            </span>
            <span className="text-[11px] font-body text-[#b592a0] mt-1">
              Supports CSV (<code>name,phone</code>) or JSON backups (<code>.json</code>)
            </span>
          </label>

          {/* Sample CSV Format Code Block */}
          <div className="space-y-1.5 pt-2">
            <span className="font-label text-[11px] uppercase tracking-wider text-[#b592a0] font-semibold">
              Sample CSV Format
            </span>
            <pre className="p-3 rounded-xl bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
              {SAMPLE_CSV_CONTENT}
            </pre>
          </div>
        </div>
      </div>

      {/* Staged CSV Preview & Diff Table */}
      {stagedRows && (
        <div className="bg-white rounded-2xl p-6 border border-[#e08aa3]/25 shadow-md space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h4 className="font-display text-lg font-bold text-[#4a3038] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#b05570]" />
                <span>Review CSV Import Preview</span>
              </h4>
              <p className="font-body text-xs text-[#b592a0]">
                Review the parsed list below. Uncheck any guests you wish to exclude before committing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStagedRows(null)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-label uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={commitStagedImport}
                disabled={isCommittingImport || stagedRows.filter((r) => r.selected).length === 0}
                className="px-5 py-2 rounded-xl bg-[#e08aa3] text-white hover:bg-[#b05570] text-xs font-label uppercase tracking-wider font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isCommittingImport ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Import {stagedRows.filter((r) => r.selected).length} Guests</span>
              </button>
            </div>
          </div>

          {/* Counts & Quick Select */}
          <div className="flex items-center justify-between text-xs font-label uppercase tracking-wider text-[#b592a0] bg-[#fffafc] p-3 rounded-xl border border-[#e08aa3]/15">
            <div className="flex items-center gap-4">
              <span className="text-emerald-700 font-semibold">
                ✓ {stagedRows.filter((r) => r.status === 'new').length} New Guests
              </span>
              <span className="text-amber-700 font-semibold">
                ⚠️ {stagedRows.filter((r) => r.status === 'duplicate').length} Duplicates
              </span>
              {stagedRows.some((r) => r.status === 'invalid') && (
                <span className="text-rose-700 font-semibold">
                  ✕ {stagedRows.filter((r) => r.status === 'invalid').length} Invalid
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSelectAllNew(true)}
                className="underline hover:text-[#4a3038] cursor-pointer"
              >
                Select All New
              </button>
              <span>•</span>
              <button
                onClick={() => toggleSelectAllNew(false)}
                className="underline hover:text-[#4a3038] cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-50 text-[#b592a0] font-label uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-2.5 pl-3 pr-1 w-8">#</th>
                  <th className="py-2.5 px-3">Guest Name</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-right">Import?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-body">
                {stagedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.selected
                        ? 'bg-emerald-50/40'
                        : row.status === 'duplicate'
                        ? 'bg-amber-50/20 opacity-70'
                        : 'bg-white opacity-60'
                    }`}
                  >
                    <td className="py-2 pl-3 pr-1 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-[#4a3038]">{row.name}</td>
                    <td className="py-2 px-3 text-gray-500 font-mono">{row.phone || '—'}</td>
                    <td className="py-2 px-3">
                      {row.status === 'new' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase bg-emerald-100 text-emerald-800">
                          New
                        </span>
                      )}
                      {row.status === 'duplicate' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase bg-amber-100 text-amber-800">
                          Duplicate ({row.reason})
                        </span>
                      )}
                      {row.status === 'invalid' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase bg-rose-100 text-rose-800">
                          Invalid
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {row.status !== 'invalid' && (
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleStagedRow(row.id)}
                          className="w-4 h-4 accent-[#e08aa3] cursor-pointer"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Duplicate Modal */}
      {showSingleDuplicateModal && singleDuplicateInvitee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-200 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowSingleDuplicateModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 mt-2 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#4a3038]">
              Duplicate Contact Detected
            </h3>

            <p className="font-body text-xs sm:text-sm text-[#704655] mt-2 leading-relaxed">
              An invitation for{' '}
              <strong className="text-[#32131c] font-semibold">
                {singleDuplicateInvitee.name}
              </strong>
              {singleDuplicateInvitee.phone ? ` (${singleDuplicateInvitee.phone})` : ''}{' '}
              already exists in your guest list.
            </p>

            <div className="w-full bg-[#fdfafb] rounded-xl p-3.5 border border-[#e08aa3]/25 my-4 text-left space-y-2">
              <span className="font-label text-[11px] uppercase tracking-wider text-[#b05570] font-semibold block">
                Existing Invitation Link:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${singleDuplicateInvitee.slug}`}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-700 select-all"
                />
                <button
                  onClick={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${singleDuplicateInvitee.slug}`;
                    navigator.clipboard.writeText(url);
                    setCopiedDuplicateLink(true);
                    notify.success('Copied existing link to clipboard!');
                    setTimeout(() => setCopiedDuplicateLink(false), 2000);
                  }}
                  className="p-2 rounded-lg bg-[#e08aa3] text-white hover:bg-[#b05570] transition-colors cursor-pointer"
                  title="Copy existing link"
                >
                  {copiedDuplicateLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
              {onNavigateToAll && (
                <button
                  onClick={() => {
                    setShowSingleDuplicateModal(false);
                    onNavigateToAll(singleDuplicateInvitee.id);
                  }}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#e08aa3] hover:bg-[#b05570] active:scale-98 text-white font-label text-xs uppercase tracking-wider font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Find in Guest List</span>
                </button>
              )}
              <button
                onClick={() => setShowSingleDuplicateModal(false)}
                className="py-3 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-700 font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
