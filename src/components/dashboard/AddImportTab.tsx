import React, { useState } from 'react';
import { Invitee } from '@/lib/types';
import { parseCsvContent, SAMPLE_CSV_CONTENT } from '@/lib/csvHelper';
import { formatPhoneNumber } from '@/lib/utils';
import { UserPlus, Upload, Copy, Check, FileText } from 'lucide-react';

interface AddImportTabProps {
  onAddInvitee: (name: string, phone?: string | null) => Promise<Invitee>;
  onBulkAddInvitees: (rows: { name: string; phone?: string }[]) => Promise<void>;
}

export const AddImportTab: React.FC<AddImportTabProps> = ({
  onAddInvitee,
  onBulkAddInvitees,
}) => {
  // Single Invitee State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvitee, setCreatedInvitee] = useState<Invitee | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // CSV Import State
  const [csvProgress, setCsvProgress] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSingleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
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
        setCsvProgress('Error: No valid rows with a "name" column found in CSV.');
        setIsUploading(false);
        return;
      }

      const formattedRows = parsed.map((r) => ({
        name: r.name,
        phone: formatPhoneNumber(r.phone) || undefined,
      }));

      setCsvProgress(`Importing ${formattedRows.length} invitees...`);
      try {
        await onBulkAddInvitees(formattedRows);
        setCsvProgress(`Successfully imported ${formattedRows.length} invitees!`);
      } catch (err) {
        console.error('Bulk import error:', err);
        setCsvProgress('Error occurred while importing rows.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel: Add Single Invitee */}
      <div className="bg-white rounded-2xl p-6 border border-[#b05570]/15 shadow-sm space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4 text-[#7d334a]">
            <UserPlus className="w-5 h-5" />
            <h4 className="font-display text-lg font-bold">Add Single Invitee</h4>
          </div>
          <p className="font-body text-xs text-[#9a7080] mb-6">
            Create an individual personalized wedding invitation link.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-label text-xs uppercase tracking-wider text-[#2d1a22] font-semibold mb-1">
                Guest / Family Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mohammed & Family"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#b05570] focus:ring-1 focus:ring-[#b05570]"
              />
            </div>

            <div>
              <label className="block font-label text-xs uppercase tracking-wider text-[#2d1a22] font-semibold mb-1">
                WhatsApp Phone Number (Numbers only)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 0771234567 or 771234567"
                value={phone}
                onChange={(e) => {
                  // Allow only numeric digits to be typed
                  const numericOnly = e.target.value.replace(/\D/g, '');
                  setPhone(numericOnly);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#b05570] focus:ring-1 focus:ring-[#b05570]"
              />
              <span className="text-[11px] text-[#9a7080] mt-1 block">
                Auto-formats to international format (e.g. <code>0771234567</code> → <code>+94771234567</code>).
              </span>
            </div>

            <button
              onClick={handleSingleSubmit}
              disabled={!name.trim() || isSubmitting}
              className="w-full py-3 px-6 rounded-xl bg-[#b05570] text-white font-label text-xs uppercase tracking-wider font-semibold shadow hover:bg-[#7d334a] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Generating...' : 'Create Invitation Link'}
            </button>
          </div>
        </div>

        {/* Success Generated Box */}
        {createdInvitee && (
          <div className="p-4 rounded-xl bg-[#fdf7f9] border border-[#b05570]/25 space-y-2 mt-4">
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
                className="p-2 rounded-lg bg-[#b05570] text-white hover:bg-[#7d334a] transition-colors cursor-pointer"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {createdInvitee.phone && (
              <p className="text-[11px] text-[#7d334a]">
                Saved WhatsApp number: <strong>{createdInvitee.phone}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: CSV Bulk Import */}
      <div className="bg-white rounded-2xl p-6 border border-[#b05570]/15 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2 text-[#7d334a]">
          <Upload className="w-5 h-5" />
          <h4 className="font-display text-lg font-bold">Bulk CSV Import</h4>
        </div>
        <p className="font-body text-xs text-[#9a7080]">
          Upload a spreadsheet or CSV file with guest names and phone numbers to generate unique
          links in bulk.
        </p>

        {/* Dashed Upload Area */}
        <label className="relative border-2 border-dashed border-[#b05570]/30 hover:border-[#b05570] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#fdfafb]/50">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
          <FileText className="w-10 h-10 text-[#b05570]/60 mb-2" />
          <span className="font-label text-xs uppercase tracking-wider text-[#2d1a22] font-semibold">
            {isUploading ? 'Processing File...' : 'Click to Upload CSV File'}
          </span>
          <span className="text-[11px] font-body text-[#9a7080] mt-1">
            Accepts CSV format with columns: <code>name</code> and <code>phone</code> (auto-converts <code>077...</code> / <code>77...</code> to <code>+94...</code>)
          </span>
        </label>

        {/* Import Progress Notification */}
        {csvProgress && (
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-body text-[#2d1a22]">
            {csvProgress}
          </div>
        )}

        {/* Sample CSV Format Code Block */}
        <div className="space-y-1.5 pt-2">
          <span className="font-label text-[11px] uppercase tracking-wider text-[#9a7080] font-semibold">
            Sample CSV Format
          </span>
          <pre className="p-3 rounded-xl bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
            {SAMPLE_CSV_CONTENT}
          </pre>
        </div>
      </div>
    </div>
  );
};
