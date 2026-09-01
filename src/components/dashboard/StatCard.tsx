import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  colorClass: string;
  subtext?: string;
  icon?: React.ReactNode;
  progress?: number;
  progressColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  colorClass,
  subtext,
  icon,
  progress,
  progressColor = 'bg-[#e08aa3]',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-[#e08aa3]/15 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-[#e08aa3]/40' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-label text-[11px] uppercase tracking-wider text-[#b592a0] font-semibold">
          {label}
        </span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className="my-2">
        <span className={`font-display text-3xl sm:text-4xl font-bold ${colorClass}`}>
          {value}
        </span>
      </div>

      <div className="space-y-1.5 mt-1">
        {progress !== undefined && (
          <div className="w-full bg-[#fff2f6] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
        {subtext && (
          <div className="text-xs font-body text-[#b592a0] flex items-center justify-between">
            <span>{subtext}</span>
            {progress !== undefined && (
              <span className="font-medium text-gray-500">{Math.round(progress)}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
