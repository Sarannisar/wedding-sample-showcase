import React from 'react';
import { motion } from 'framer-motion';

interface ResponseBarProps {
  attendingPercent: number;
  declinedPercent: number;
  pendingPercent: number;
}

export const ResponseBar: React.FC<ResponseBarProps> = ({
  attendingPercent,
  declinedPercent,
  pendingPercent,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#b05570]/15 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-bold text-[#2d1a22]">
          Response Breakdown
        </h4>
        <span className="font-label text-xs uppercase tracking-wider text-[#9a7080]">
          Live RSVP Status
        </span>
      </div>

      {/* Tri-color Horizontal Bar */}
      <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${attendingPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-emerald-500"
          title={`Attending: ${attendingPercent}%`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${declinedPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
          className="h-full bg-rose-500"
          title={`Declined: ${declinedPercent}%`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pendingPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="h-full bg-amber-400"
          title={`Pending: ${pendingPercent}%`}
        />
      </div>

      {/* Legend Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs font-label uppercase tracking-wider text-[#2d1a22]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Attending: <strong>{attendingPercent}%</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span>Declined: <strong>{declinedPercent}%</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span>Pending: <strong>{pendingPercent}%</strong></span>
        </div>
      </div>
    </div>
  );
};
