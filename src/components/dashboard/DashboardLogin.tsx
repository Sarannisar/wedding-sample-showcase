import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Sparkles, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { ADMIN_EMAIL, ADMIN_NAME, signInAdmin, recordAuthSession } from '@/lib/dashboardAuth';
import { supabase } from '@/lib/supabase';
import { weddingConfig } from '@/config/weddingConfig';
import { notify } from '@/lib/notify';

interface DashboardLoginProps {
  onLoginSuccess: () => void;
}

export const DashboardLogin: React.FC<DashboardLoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomEmail, setShowCustomEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Please enter the dashboard password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const activeEmail = showCustomEmail && customEmail.trim() ? customEmail.trim() : ADMIN_EMAIL;

    // Use custom email if toggled, otherwise default admin
    const result = await (showCustomEmail && customEmail.trim()
      ? (async () => {
          if (!supabase) return { success: false, error: 'Supabase is not configured.' };
          const { data, error } = await supabase.auth.signInWithPassword({
            email: activeEmail,
            password: password.trim(),
          });
          if (error) return { success: false, error: error.message };
          if (!data.session) return { success: false, error: 'Could not create session.' };
          recordAuthSession(rememberMe);
          return { success: true };
        })()
      : signInAdmin(password, rememberMe));

    setIsSubmitting(false);

    if (result.success) {
      notify.success(`Welcome back, ${ADMIN_NAME}! 🌸`);
      onLoginSuccess();
    } else {
      setErrorMessage(
        result.error?.includes('Invalid login credentials')
          ? 'Incorrect password. Please verify and try again.'
          : result.error || 'Authentication failed. Please check credentials.'
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fffafc] flex items-center justify-center p-4 sm:p-6 text-[#4a3038] relative overflow-hidden select-none">
      {/* Subtle Ambient Decorative Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#f7c1d0]/25 to-[#e08aa3]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-tl from-[#e08aa3]/20 to-[#f9dde5]/30 blur-3xl pointer-events-none" />

      {/* Main Luxury Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-7 sm:p-9 border border-[#e08aa3]/25 shadow-2xl space-y-6">
          {/* Header Monogram Seal */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#fff0f4] border border-[#e08aa3]/35 flex items-center justify-center shadow-inner">
                <img
                  src="/assets/logo_saad_sheen_crest.png"
                  alt="S & S Crest"
                  className="w-10 h-10 object-contain drop-shadow-xs"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-[#e08aa3] to-[#b05570] text-white flex items-center justify-center shadow-xs">
                <Lock className="w-3 h-3" />
              </div>
            </div>

            <div>
              <span className="font-label text-[10px] uppercase tracking-[0.3em] text-[#b05570] font-bold block mb-1">
                Host Administration
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#4a3038]">
                Welcome, {ADMIN_NAME}
              </h2>
              <p className="font-body text-xs text-[#8c5e6e] mt-1">
                Enter your password to manage guests, RSVPs, and invitations.
              </p>
            </div>

            {/* Configured Admin Email Pill */}
            {!showCustomEmail && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff2f6] border border-[#e08aa3]/20 text-[11px] font-label text-[#7a4d5d]">
                <Shield className="w-3 h-3 text-[#e08aa3]" />
                <span>{ADMIN_EMAIL}</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message Shake */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Email Input (Hidden by default, can be toggled) */}
            {showCustomEmail && (
              <div className="space-y-1">
                <label className="block text-xs font-label uppercase tracking-wider text-[#7a4d5d] font-semibold">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="admin@wedding.com"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-[#e08aa3]/35 focus:outline-none focus:border-[#b05570] focus:ring-2 focus:ring-[#e08aa3]/20 text-sm font-body transition-all"
                />
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-label uppercase tracking-wider text-[#7a4d5d] font-semibold">
                  Password
                </label>
                <span className="text-[11px] font-body text-[#b592a0]">
                  {weddingConfig.admin.defaultSessionDays}-day access
                </span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your dashboard password"
                  className="w-full px-4 py-3.5 pr-11 rounded-2xl bg-white border border-[#e08aa3]/35 focus:outline-none focus:border-[#b05570] focus:ring-2 focus:ring-[#e08aa3]/25 text-sm font-body text-[#4a3038] placeholder:text-[#c4a4af] transition-all shadow-xs"
                />

                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={() => setShowPassword(true)}
                  onTouchEnd={() => setShowPassword(false)}
                  onTouchCancel={() => setShowPassword(false)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setShowPassword(true);
                    }
                  }}
                  onKeyUp={() => setShowPassword(false)}
                  onBlur={() => setShowPassword(false)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all cursor-pointer p-1 rounded-md select-none touch-none ${
                    showPassword
                      ? 'text-[#b05570] bg-[#fff0f4] scale-110'
                      : 'text-[#b592a0] hover:text-[#7a4d5d]'
                  }`}
                  title="Press and hold to view password"
                  aria-label="Press and hold to view password"
                >
                  {showPassword ? <Eye className="w-4 h-4 text-[#b05570]" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me 30-Day Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#e08aa3] text-[#b05570] focus:ring-[#e08aa3] cursor-pointer"
                />
                <div className="text-xs font-body text-[#7a4d5d] leading-tight">
                  <span className="font-semibold text-[#4a3038] group-hover:text-[#b05570] transition-colors">
                    Keep me signed in for 30 days
                  </span>
                  <span className="block text-[11px] text-[#b592a0]">
                    (Default is {weddingConfig.admin.defaultSessionDays} days before requiring password)
                  </span>
                </div>
              </label>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#e08aa3] to-[#b05570] hover:from-[#d87c96] hover:to-[#9f4861] text-white font-label text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold shadow-lg hover:shadow-xl active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Unlock Dashboard</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Toggle */}
          <div className="pt-2 border-t border-[#e08aa3]/15 text-center">
            <button
              type="button"
              onClick={() => {
                setShowCustomEmail(!showCustomEmail);
                setErrorMessage(null);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-label text-[#b592a0] hover:text-[#7a4d5d] transition cursor-pointer"
            >
              <span>{showCustomEmail ? 'Switch back to default login' : 'Login with different email?'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Brand footer line */}
        <p className="text-center font-display italic text-xs text-[#b592a0] mt-4">
          Safiyya &amp; Sharrafuth · Wedding Celebration
        </p>
      </motion.div>
    </div>
  );
};
