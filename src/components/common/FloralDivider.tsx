import React from 'react';

interface FloralDividerProps {
  className?: string;
}

export const FloralDivider: React.FC<FloralDividerProps> = ({
  className = 'my-8',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-3 w-full max-w-xs mx-auto select-none pointer-events-none ${className}`}
    >
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#e08aa3]/40" />
      <div className="flex items-center gap-1.5 text-[#e08aa3]/70">
        <span className="text-xs">✦</span>
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-current text-[#e08aa3]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C12 7.523 7.523 12 2 12C7.523 12 12 16.477 12 22C12 16.477 16.477 12 22 12C16.477 12 12 7.523 12 2Z" />
        </svg>
        <span className="text-xs">✦</span>
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#e08aa3]/40" />
    </div>
  );
};
