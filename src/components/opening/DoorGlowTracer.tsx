import React from 'react';

interface DoorGlowTracerProps {
  /** 0 = fully visible tracing, 1 = fully faded out */
  fade?: number;
}

/**
 * Draws a luminous outline along the door panels and the central crest,
 * mimicking a light pen tracing the invitation design before it opens.
 */
export const DoorGlowTracer: React.FC<DoorGlowTracerProps> = ({ fade = 0 }) => {
  const opacity = Math.max(0, 1 - fade * 1.6);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 transition-opacity duration-500"
      style={{ opacity }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 200 400"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <filter id="doorGlowBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Left door outline */}
        <rect
          x="6"
          y="8"
          width="88"
          height="384"
          rx="10"
          stroke="#ffd9e6"
          strokeWidth="1.6"
          filter="url(#doorGlowBlur)"
          className="glow-trace"
          pathLength={1}
        />
        {/* Right door outline */}
        <rect
          x="106"
          y="8"
          width="88"
          height="384"
          rx="10"
          stroke="#ffd9e6"
          strokeWidth="1.6"
          filter="url(#doorGlowBlur)"
          className="glow-trace glow-trace-delay-1"
          pathLength={1}
        />
        {/* Inner panel detailing */}
        <rect
          x="18"
          y="26"
          width="64"
          height="348"
          rx="7"
          stroke="#ffeef4"
          strokeWidth="0.8"
          filter="url(#doorGlowBlur)"
          className="glow-trace glow-trace-delay-2"
          pathLength={1}
        />
        <rect
          x="118"
          y="26"
          width="64"
          height="348"
          rx="7"
          stroke="#ffeef4"
          strokeWidth="0.8"
          filter="url(#doorGlowBlur)"
          className="glow-trace glow-trace-delay-2"
          pathLength={1}
        />
      </svg>

      {/* Crest glow ring traced around the central S&S logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="132"
          height="132"
          viewBox="0 0 100 100"
          fill="none"
          className="drop-shadow-[0_0_12px_rgba(255,200,220,0.9)]"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="#fff0f5"
            strokeWidth="2"
            className="glow-trace glow-trace-delay-3"
            pathLength={1}
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="#ffd9e6"
            strokeWidth="1"
            className="glow-trace glow-trace-delay-4"
            pathLength={1}
          />
        </svg>
      </div>
    </div>
  );
};
