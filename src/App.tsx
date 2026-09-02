import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const GuestInvitePage = lazy(() =>
  import('@/pages/GuestInvitePage').then((m) => ({ default: m.GuestInvitePage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const PageFallbackLoader: React.FC = () => (
  <div className="min-h-screen w-full bg-[#fffafc] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#e08aa3]/30 border-t-[#e08aa3] animate-spin" />
      <span className="font-label text-xs uppercase tracking-widest text-[#b592a0]">
        Loading...
      </span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: '#fffafc',
            border: '1px solid rgba(224, 138, 163, 0.3)',
            color: '#4a3038',
            fontFamily: 'Lora, Georgia, serif',
            boxShadow: '0 10px 25px -5px rgba(224, 138, 163, 0.2)',
          },
        }}
      />
    <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="The invitation application encountered an unexpected error.">
      <Router>
        <Suspense fallback={<PageFallbackLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ErrorBoundary
                  fallbackTitle="Dashboard Error"
                  fallbackMessage="There was a problem loading the dashboard."
                >
                  <DashboardPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/invite/:slug"
              element={
                <ErrorBoundary
                  fallbackTitle="Invitation Error"
                  fallbackMessage="There was a problem loading this invitation."
                >
                  <GuestInvitePage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/invite"
              element={
                <ErrorBoundary
                  fallbackTitle="Invitation Error"
                  fallbackMessage="There was a problem loading the invitation."
                >
                  <GuestInvitePage />
                </ErrorBoundary>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
    </>
  );
};

export default App;
