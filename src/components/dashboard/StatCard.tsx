import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  colorClass: string;
  subtext?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  colorClass,
  subtext,
  icon,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#b05570]/15 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="font-label text-[11px] uppercase tracking-wider text-[#9a7080] font-semibold">
          {label}
        </span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="my-2">
        <span className={`font-display text-3xl sm:text-4xl font-bold ${colorClass}`}>
          {value}
        </span>
      </div>
      {subtext && (
        <span className="text-xs font-body text-[#9a7080]">{subtext}</span>
      )}
    </div>
  );
};
