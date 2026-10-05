import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface MemoriesPasscodeModalProps {
  eventName: string;
  expectedHash?: string | null;
  onSuccess: () => void;
}

export const MemoriesPasscodeModal: React.FC<MemoriesPasscodeModalProps> = ({
  eventName,
  expectedHash,
  onSuccess,
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the event passcode.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // If expectedHash is present, compute SHA-256 or match
      const encoder = new TextEncoder();
      const data = encoder.encode(passcode.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      if (!expectedHash || expectedHash === passcode.trim() || expectedHash === hashHex) {
        onSuccess();
      } else {
        setError('Incorrect passcode. Please check the wedding invitation or ask the hosts.');
      }
    } catch {
      setError('Could not verify passcode. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4a3038]/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#e08aa3]/30 text-center">
        <div className="w-16 h-16 rounded-full bg-[#fff2f6] border border-[#e08aa3]/30 flex items-center justify-center mx-auto mb-4 text-[#e08aa3]">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="font-display text-2xl text-[#4a3038] font-bold mb-1">Passcode Protected</h2>
        <p className="font-body text-sm text-[#7a4d5d] mb-6">
          <strong>{eventName}</strong> memories are private. Please enter the passcode to share your photos and videos.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter wedding passcode"
            className="w-full px-4 py-3.5 rounded-2xl border border-[#e08aa3]/30 focus:border-[#e08aa3] focus:ring-2 focus:ring-[#e08aa3]/20 outline-none text-center text-lg tracking-widest bg-[#fffafc] text-[#4a3038]"
          />

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#e08aa3] to-[#b05570] hover:from-[#d17e92] hover:to-[#9c4b63] text-white font-label uppercase text-sm tracking-wider font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <span>Verifying...</span>
            ) : (
              <>
                <span>Enter Memories</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
