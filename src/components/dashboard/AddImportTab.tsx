import React, { useState } from 'react';
import { Invitee } from '@/lib/types';
import { parseCsvContent, SAMPLE_CSV_CONTENT } from '@/lib/csvHelper';
import { formatPhoneNumber } from '@/lib/utils';
import { fetchInvitees } from '@/lib/supabase';
import {
  UserPlus,
  Upload,
  Copy,
  Check,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  AlertCircle,
} from 'lucide-react';

interface AddImportTabProps {
  existingInvitees?: Invitee[];
  onAddInvitee: (name: string, phone?: string | null) => Promise<Invitee>;
  onBulkAddInvitees: (rows: { name: string; phone?: string }[]) => Promise<void>;
  onNavigateToAll?: (targetId?: string) => void;
}

interface SkippedDuplicate {
  name: string;
  phone?: string;
  reason: string;
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

  // If both have phone numbers, they must match
  if (digitsA && digitsB) {
    return digitsA === digitsB;
  }
  // If neither has a phone number, same name is a duplicate
  if (!digitsA && !digitsB) {
    return true;
  }
  // If one has a phone number and the other doesn't
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

  // CSV Import State
  const [csvProgress, setCsvProgress] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // CSV Confirmation Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [importedRows, setImportedRows] = useState<{ name: string; phone?: string }[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState<SkippedDuplicate[]>([]);
  const [modalActiveTab, setModalActiveTab] = useState<'imported' | 'skipped'>('imported');

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
        setIsSubmitting(false);
        return;
      }

      const result = await onAddInvitee(name, formattedPhone);
      setCreatedInvitee(result);
      setName('');
      setPhone('');
    } catch (err) {
      console.error('Failed to create invitee:', err);
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
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCsvProgress('Reading CSV file...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsed = parseCsvContent(text);

      if (parsed.length === 0) {
        setCsvProgress('Error: No valid guest rows found in CSV file.');
        setIsUploading(false);
        return;
      }

      setCsvProgress('Checking for duplicates and preparing contacts...');

      // Fetch live list to ensure fresh duplicate checking
      const currentDbList =
        existingInvitees.length > 0 ? existingInvitees : await fetchInvitees();

      const uniqueRows: { name: string; phone?: string }[] = [];
      const skipped: SkippedDuplicate[] = [];
      const seenInBatch: { name: string; phone?: string }[] = [];

      for (const row of parsed) {
        const rowName = row.name.trim();
        if (!rowName) continue;
        const formattedPhone = formatPhoneNumber(row.phone) || undefined;

        // Check if already in the system
        const existingMatch = currentDbList.find((inv) =>
          isSameContact(inv.name, inv.phone, rowName, formattedPhone)
        );
        if (existingMatch) {
          skipped.push({
            name: rowName,
            phone: formattedPhone,
            reason: 'Already in guest list',
          });
          continue;
        }

        // Check if duplicate within this same CSV file
        const batchMatch = seenInBatch.find((inv) =>
          isSameContact(inv.name, inv.phone, rowName, formattedPhone)
        );
        if (batchMatch) {
          skipped.push({
            name: rowName,
            phone: formattedPhone,
            reason: 'Duplicate entry in CSV',
          });
          continue;
        }

        seenInBatch.push({ name: rowName, phone: formattedPhone });
        uniqueRows.push({ name: rowName, phone: formattedPhone });
      }

      try {
        if (uniqueRows.length > 0) {
          setCsvProgress(`Importing ${uniqueRows.length} new invitees...`);
          await onBulkAddInvitees(uniqueRows);
        }

        setImportedRows(uniqueRows);
        setSkippedDuplicates(skipped);
        setModalActiveTab(uniqueRows.length > 0 ? 'imported' : 'skipped');
        setShowSuccessModal(true);

        if (uniqueRows.length > 0 && skipped.length > 0) {
          setCsvProgress(
            `Imported ${uniqueRows.length} contacts (${skipped.length} duplicates skipped).`
          );
        } else if (uniqueRows.length > 0) {
          setCsvProgress(`Successfully imported ${uniqueRows.length} contacts!`);
        } else {
          setCsvProgress(
            `No new contacts imported. All ${skipped.length} rows are already in your guest list.`
          );
        }
      } catch (err) {
        console.error('Bulk import error:', err);
        setImportedRows(uniqueRows);
        setSkippedDuplicates(skipped);
        setShowSuccessModal(true);
        setCsvProgress(`Import process completed.`);
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
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
                WhatsApp Phone Number (Numbers only)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 0771234567 or 771234567"
                value={phone}
                onChange={(e) => {
                  const numericOnly = e.target.value.replace(/\D/g, '');
                  setPhone(numericOnly);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3]"
              />
              <span className="text-[11px] text-[#b592a0] mt-1 block">
                Auto-formats to international format (e.g. <code>0771234567</code> → <code>+94771234567</code>).
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
          <h4 className="font-display text-lg font-bold">Bulk CSV Import</h4>
        </div>
        <p className="font-body text-xs text-[#b592a0]">
          Upload a spreadsheet or CSV file with guest names and phone numbers to generate unique
          links in bulk. Duplicate entries are automatically skipped.
        </p>

        {/* Dashed Upload Area */}
        <label className="relative border-2 border-dashed border-[#e08aa3]/30 hover:border-[#e08aa3] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#fdfafb]/50">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
          <FileText className="w-10 h-10 text-[#e08aa3]/60 mb-2" />
          <span className="font-label text-xs uppercase tracking-wider text-[#4a3038] font-semibold">
            {isUploading ? 'Processing File...' : 'Click to Upload CSV File'}
          </span>
          <span className="text-[11px] font-body text-[#b592a0] mt-1">
            Accepts CSV with or without header columns (e.g. <code>name,phone</code> or just <code>Mohammed & Family, 077...</code>)
          </span>
        </label>

        {/* Import Progress Notification */}
        {csvProgress && (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-body text-[#4a3038]">
            {csvProgress}
          </div>
        )}

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

      {/* Single Invitee Duplicate Warning Modal */}
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

            {/* Amber Warning Icon Badge */}
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
              {singleDuplicateInvitee.phone
                ? ` (${singleDuplicateInvitee.phone})`
                : ''}{' '}
              already exists in your guest list.
            </p>

            {/* Existing Invitation Link Box */}
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
                    setTimeout(() => setCopiedDuplicateLink(false), 2000);
                  }}
                  className="p-2 rounded-lg bg-[#e08aa3] text-white hover:bg-[#b05570] transition-colors cursor-pointer"
                  title="Copy existing link"
                >
                  {copiedDuplicateLink ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
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

      {/* CSV Import Summary & Confirmation Modal Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#e08aa3]/30 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close popup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Icon Badge */}
            {importedRows.length > 0 ? (
              <div className="relative mb-4 mt-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                {skippedDuplicates.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold border-2 border-white">
                    !
                  </span>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 mt-2 shadow-inner">
                <AlertCircle className="w-9 h-9" />
              </div>
            )}

            {/* Heading */}
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#4a3038]">
              {importedRows.length > 0
                ? 'CSV Import Complete!'
                : 'No New Contacts to Import'}
            </h3>

            {/* Subtitle / Description */}
            <div className="font-body text-xs sm:text-sm text-[#704655] mt-2 leading-relaxed space-y-1">
              {importedRows.length > 0 ? (
                <p>
                  Successfully imported{' '}
                  <strong className="text-emerald-700 font-semibold">
                    {importedRows.length} new contact
                    {importedRows.length !== 1 ? 's' : ''}
                  </strong>{' '}
                  and generated personalized invite links.
                </p>
              ) : (
                <p>
                  All contacts in the uploaded CSV are already present in your guest list.
                </p>
              )}

              {skippedDuplicates.length > 0 && (
                <p className="text-amber-700 font-medium text-xs bg-amber-50 py-1 px-3 rounded-lg border border-amber-200/60 inline-block mt-1">
                  ⚠️ {skippedDuplicates.length} duplicate contact
                  {skippedDuplicates.length !== 1 ? 's were' : ' was'} automatically skipped.
                </p>
              )}
            </div>

            {/* Tabs for Imported vs Skipped (if both exist or if skipped exist) */}
            <div className="w-full flex items-center gap-2 mt-4 border-b border-gray-100 pb-2">
              <button
                onClick={() => setModalActiveTab('imported')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  modalActiveTab === 'imported'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Imported ({importedRows.length})
              </button>

              {skippedDuplicates.length > 0 && (
                <button
                  onClick={() => setModalActiveTab('skipped')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                    modalActiveTab === 'skipped'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Skipped Duplicates ({skippedDuplicates.length})
                </button>
              )}
            </div>

            {/* Tab 1: Imported Contacts List */}
            {modalActiveTab === 'imported' && (
              <div className="w-full max-h-44 overflow-y-auto rounded-xl border border-gray-100 bg-[#fdfafb] p-3 text-left my-2 space-y-1.5 divide-y divide-gray-100">
                {importedRows.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No new contacts were imported in this file.
                  </p>
                ) : (
                  <>
                    {importedRows.slice(0, 100).map((row, idx) => (
                      <div
                        key={idx}
                        className="pt-1.5 first:pt-0 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-medium text-[#4a3038] truncate">
                            {row.name}
                          </span>
                        </div>
                        <span className="text-[#b592a0] font-mono text-[11px] ml-2 shrink-0">
                          {row.phone || 'No phone'}
                        </span>
                      </div>
                    ))}
                    {importedRows.length > 100 && (
                      <p className="text-[11px] text-[#b05570] text-center pt-2 italic">
                        + {importedRows.length - 100} more contacts
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Skipped Duplicate Contacts List */}
            {modalActiveTab === 'skipped' && (
              <div className="w-full max-h-44 overflow-y-auto rounded-xl border border-amber-100 bg-amber-50/30 p-3 text-left my-2 space-y-1.5 divide-y divide-amber-100/60">
                {skippedDuplicates.slice(0, 100).map((item, idx) => (
                  <div
                    key={idx}
                    className="pt-1.5 first:pt-0 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <div className="flex flex-col truncate">
                        <span className="font-medium text-[#4a3038] truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-amber-700 font-medium">
                          {item.reason}
                        </span>
                      </div>
                    </div>
                    <span className="text-[#b592a0] font-mono text-[11px] ml-2 shrink-0">
                      {item.phone || 'No phone'}
                    </span>
                  </div>
                ))}
                {skippedDuplicates.length > 100 && (
                  <p className="text-[11px] text-amber-700 text-center pt-2 italic">
                    + {skippedDuplicates.length - 100} more duplicates
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-3">
              {onNavigateToAll && (
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    onNavigateToAll();
                  }}
                  className="flex-1 py-3 px-5 rounded-xl bg-[#e08aa3] hover:bg-[#b05570] active:scale-98 text-white font-label text-xs uppercase tracking-wider font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>View All Invitees</span>
                </button>
              )}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="py-3 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-700 font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
