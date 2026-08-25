import React from 'react';

interface CornerBracketsProps {
  color?: string;
  size?: number;
  weight?: number;
  offset?: number;
}

export const CornerBrackets: React.FC<CornerBracketsProps> = ({
  color = '#f2b8c6',
  size = 20,
  weight = 1.2,
  offset = 8,
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{ margin: `${offset}px` }}
    >
      {/* Top Left Corner */}
      <svg
        className="absolute top-0 left-0"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M0 24V0H24"
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="square"
        />
        <path
          d="M4 24V4H24"
          stroke={color}
          strokeWidth={weight * 0.75}
          strokeOpacity={0.6}
          strokeLinecap="square"
        />
      </svg>

      {/* Top Right Corner */}
      <svg
        className="absolute top-0 right-0"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M24 24V0H0"
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="square"
        />
        <path
          d="M20 24V4H0"
          stroke={color}
          strokeWidth={weight * 0.75}
          strokeOpacity={0.6}
          strokeLinecap="square"
        />
      </svg>

      {/* Bottom Left Corner */}
      <svg
        className="absolute bottom-0 left-0"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M0 0V24H24"
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="square"
        />
        <path
          d="M4 0V20H24"
          stroke={color}
          strokeWidth={weight * 0.75}
          strokeOpacity={0.6}
          strokeLinecap="square"
        />
      </svg>

      {/* Bottom Right Corner */}
      <svg
        className="absolute bottom-0 right-0"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M24 0V24H0"
          stroke={color}
          strokeWidth={weight}
          strokeLinecap="square"
        />
        <path
          d="M20 0V20H0"
          stroke={color}
          strokeWidth={weight * 0.75}
          strokeOpacity={0.6}
          strokeLinecap="square"
        />
      </svg>
    </div>
  );
};
