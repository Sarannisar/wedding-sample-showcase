import React from 'react';
import { Link } from 'react-router-dom';
import { Card3D } from '@/components/common/Card3D';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffafc]">
      <Card3D className="max-w-md text-center py-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#fff2f6] border border-[#e08aa3]/30 flex items-center justify-center">
          <span className="text-2xl text-[#e08aa3]">🌸</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-[#4a3038] mb-2">
          Page Not Found
        </h1>
        <p className="font-body text-[#b592a0] text-sm mb-6">
          The wedding invitation link you followed does not seem to exist or may have expired.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-2.5 rounded-full bg-[#e08aa3] text-white font-label text-xs uppercase tracking-[0.2em] shadow-md hover:bg-[#b05570] transition-colors"
        >
          Return to Dashboard
        </Link>
      </Card3D>
    </div>
  );
};
