import React, { useState } from 'react';
import { X, Save, Sliders, Shield, Camera, Video, Lock, Layers } from 'lucide-react';
import { WeddingEvent } from '@/lib/memoriesTypes';
import { updateWeddingEvent } from '@/lib/memoriesService';
import { notify } from '@/lib/notify';

interface MemoriesSettingsModalProps {
  event: WeddingEvent;
  onClose: () => void;
  onSaved: (updated: WeddingEvent) => void;
}

export const MemoriesSettingsModal: React.FC<MemoriesSettingsModalProps> = ({
  event,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState<WeddingEvent>({ ...event });
  const [plainPasscode, setPlainPasscode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof WeddingEvent) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updates: Partial<WeddingEvent> = {
        name: formData.name.trim(),
        welcome_message: formData.welcome_message?.trim() || null,
        upload_enabled: formData.upload_enabled,
        gallery_enabled: formData.gallery_enabled,
        live_display_enabled: formData.live_display_enabled !== false,
        guest_downloads_enabled: formData.guest_downloads_enabled,
        moderation_enabled: formData.moderation_enabled,
        passcode_enabled: formData.passcode_enabled,
        photo_size_limit_mb: Number(formData.photo_size_limit_mb) || 25,
        video_size_limit_mb: Number(formData.video_size_limit_mb) || 500,
        max_files_per_batch: Number(formData.max_files_per_batch) || 100,
        allow_guest_name: formData.allow_guest_name,
      };

      if (formData.passcode_enabled && plainPasscode.trim()) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plainPasscode.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        updates.passcode_hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      }

      const res = await updateWeddingEvent(event.id, updates);
      if (res.success && res.event) {
        notify.success('Memories settings updated successfully.');
        onSaved(res.event);
        onClose();
      } else {
        notify.error(res.error || 'Failed to update settings.');
      }
    } catch (err: any) {
      notify.error(err?.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4a3038]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#e08aa3]/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#e08aa3]/20 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#fff2f6] text-[#b05570]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#4a3038]">
                Memories Settings
              </h2>
              <p className="text-xs text-[#7a4d5d]">
                Configure guest drop rules, moderation, and limits
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-xs font-label uppercase tracking-widest text-[#7a4d5d] font-semibold mb-1.5">
              Event Display Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e08aa3]/30 text-sm outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3]/30"
            />
          </div>

          {/* Welcome Message */}
          <div>
            <label className="block text-xs font-label uppercase tracking-widest text-[#7a4d5d] font-semibold mb-1.5">
              Guest Welcome Message
            </label>
            <textarea
              rows={2}
              value={formData.welcome_message || ''}
              onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e08aa3]/30 text-sm outline-none focus:border-[#e08aa3] focus:ring-1 focus:ring-[#e08aa3]/30 resize-none"
            />
          </div>

          {/* Feature Toggles */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-label uppercase tracking-widest text-[#b05570] font-semibold">
              Access &amp; Permissions
            </h3>

            {/* Uploads Enabled */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
              <div>
                <p className="text-sm font-semibold text-[#4a3038]">Guest Uploads</p>
                <p className="text-xs text-[#7a4d5d]">Allow guests to upload photos &amp; videos</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('upload_enabled')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  formData.upload_enabled ? 'bg-[#e08aa3] justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
              </button>
            </div>

            {/* Gallery Enabled */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
              <div>
                <p className="text-sm font-semibold text-[#4a3038]">Public Guest Gallery</p>
                <p className="text-xs text-[#7a4d5d]">
                  Allow guests to view approved memories in the gallery
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('gallery_enabled')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  formData.gallery_enabled ? 'bg-[#e08aa3] justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
              </button>
            </div>

            {/* Live TV Display */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
              <div>
                <p className="text-sm font-semibold text-[#4a3038]">Live TV / Projector Display</p>
                <p className="text-xs text-[#7a4d5d]">
                  Enable big-screen live slideshow (/memories/{formData.slug}/live)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('live_display_enabled')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  formData.live_display_enabled !== false ? 'bg-[#e08aa3] justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
              </button>
            </div>

            {/* Guest Downloads */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
              <div>
                <p className="text-sm font-semibold text-[#4a3038]">Guest Downloads</p>
                <p className="text-xs text-[#7a4d5d]">Allow guests to download photos from the gallery</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('guest_downloads_enabled')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  formData.guest_downloads_enabled ? 'bg-[#e08aa3] justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
              </button>
            </div>

            {/* Moderation Enabled */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
              <div>
                <p className="text-sm font-semibold text-[#4a3038]">Host Moderation Required</p>
                <p className="text-xs text-[#7a4d5d]">
                  Hold uploads in 'Pending' until you approve them
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('moderation_enabled')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  formData.moderation_enabled ? 'bg-[#e08aa3] justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
              </button>
            </div>

            {/* Passcode Protection */}
            <div className="p-3.5 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#4a3038]">Passcode Protection</p>
                  <p className="text-xs text-[#7a4d5d]">Require guests to enter a passcode to access</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('passcode_enabled')}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    formData.passcode_enabled ? 'bg-[#e08aa3] justify-end' : 'bg-gray-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
                </button>
              </div>

              {formData.passcode_enabled && (
                <div className="pt-2 border-t border-[#e08aa3]/10">
                  <input
                    type="text"
                    value={plainPasscode}
                    onChange={(e) => setPlainPasscode(e.target.value)}
                    placeholder="Set new passcode (leave blank to keep current)"
                    className="w-full px-3 py-2 rounded-xl border border-[#e08aa3]/30 text-xs bg-white outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Upload Limits (Customizable for R2) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-label uppercase tracking-widest text-[#b05570] font-semibold">
                Upload &amp; File Size Limits
              </h3>
              <span className="text-[10px] text-[#7a4d5d] bg-[#fff2f6] px-2 py-0.5 rounded-full border border-[#e08aa3]/20">
                Powered by Cloudflare R2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
                <label className="block text-[11px] font-label uppercase tracking-wider text-[#7a4d5d] font-semibold mb-1 flex items-center justify-between">
                  <span>Photo Limit (MB)</span>
                  <span className="text-gray-400 font-normal">Max 500 MB</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={formData.photo_size_limit_mb}
                  onChange={(e) => setFormData({ ...formData, photo_size_limit_mb: Math.max(1, Number(e.target.value)) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e08aa3]/30 text-sm font-semibold text-[#4a3038] outline-none bg-white focus:border-[#e08aa3]"
                />
                <div className="flex gap-1.5 mt-2">
                  {[25, 50, 100, 250].map((mb) => (
                    <button
                      type="button"
                      key={mb}
                      onClick={() => setFormData({ ...formData, photo_size_limit_mb: mb })}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                        formData.photo_size_limit_mb === mb
                          ? 'bg-[#e08aa3] text-white border-[#e08aa3]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#e08aa3]'
                      }`}
                    >
                      {mb}MB
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
                <label className="block text-[11px] font-label uppercase tracking-wider text-[#7a4d5d] font-semibold mb-1 flex items-center justify-between">
                  <span>Video Limit (MB)</span>
                  <span className="text-gray-400 font-normal">Max 10 GB</span>
                </label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  value={formData.video_size_limit_mb}
                  onChange={(e) => setFormData({ ...formData, video_size_limit_mb: Math.max(10, Number(e.target.value)) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e08aa3]/30 text-sm font-semibold text-[#4a3038] outline-none bg-white focus:border-[#e08aa3]"
                />
                <div className="flex gap-1.5 mt-2">
                  {[500, 1000, 2000, 5000].map((mb) => (
                    <button
                      type="button"
                      key={mb}
                      onClick={() => setFormData({ ...formData, video_size_limit_mb: mb })}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                        formData.video_size_limit_mb === mb
                          ? 'bg-[#e08aa3] text-white border-[#e08aa3]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#e08aa3]'
                      }`}
                    >
                      {mb >= 1000 ? `${mb / 1000}GB` : `${mb}MB`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#fffafc] border border-[#e08aa3]/20">
                <label className="block text-[11px] font-label uppercase tracking-wider text-[#7a4d5d] font-semibold mb-1 flex items-center justify-between">
                  <span>Max Files / Batch</span>
                  <span className="text-gray-400 font-normal">Max 1000</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.max_files_per_batch}
                  onChange={(e) => setFormData({ ...formData, max_files_per_batch: Math.max(1, Number(e.target.value)) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#e08aa3]/30 text-sm font-semibold text-[#4a3038] outline-none bg-white focus:border-[#e08aa3]"
                />
                <div className="flex gap-1.5 mt-2">
                  {[50, 100, 250, 500].map((count) => (
                    <button
                      type="button"
                      key={count}
                      onClick={() => setFormData({ ...formData, max_files_per_batch: count })}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                        formData.max_files_per_batch === count
                          ? 'bg-[#e08aa3] text-white border-[#e08aa3]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#e08aa3]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e08aa3]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#e08aa3] to-[#b05570] hover:from-[#d17e92] hover:to-[#9c4b63] text-white text-xs font-label uppercase tracking-wider font-semibold shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
