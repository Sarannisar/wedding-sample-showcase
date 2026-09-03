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
  primary?: boolean;
  accentBorderClass?: string;
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
  primary = false,
  accentBorderClass,
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`rounded-2xl transition-all duration-200 flex flex-col justify-between ${
        primary
          ? `bg-white p-6 sm:p-7 shadow-sm hover:shadow-md border-2 ${
              accentBorderClass || 'border-[#e08aa3]/30'
            }`
          : `bg-white/95 p-4 sm:p-5 shadow-xs hover:shadow-sm border border-[#e08aa3]/15`
      } ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#e08aa3] focus-visible:outline-none'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`font-label uppercase font-semibold ${
            primary
              ? 'text-xs tracking-wider text-[#7a5563]'
              : 'text-[11px] tracking-wider text-[#7a4d5d]'
          }`}
        >
          {label}
        </span>
        {icon && <div>{icon}</div>}
      </div>

      <div className={primary ? 'my-3' : 'my-1.5'}>
        <span
          className={`font-display font-bold tracking-tight ${colorClass} ${
            primary ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
          }`}
        >
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
          <div className="text-xs font-body text-[#7a4d5d] flex items-center justify-between">
            <span>{subtext}</span>
            {progress !== undefined && (
              <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
