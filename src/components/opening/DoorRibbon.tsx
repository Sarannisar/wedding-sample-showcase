import React from 'react';

interface DoorRibbonProps {
  /** 0 = tied bow, 1 = fully untied and slipped away */
  untie: number;
}

/**
 * A satin ribbon tied in a bow across the centre of the doors.
 * As `untie` progresses the bow loops shrink, the knot releases and the
 * ribbon bands slide off to either side just before the doors part.
 */
export const DoorRibbon: React.FC<DoorRibbonProps> = ({ untie }) => {
  const bowScale = Math.max(0, 1 - untie * 1.6);
  const bowOpacity = Math.max(0, 1 - untie * 2);
  const bandShift = untie * 70;
  const bandOpacity = Math.max(0, 1 - Math.max(0, untie - 0.45) * 2.2);

  return (
    <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
      {/* Horizontal satin band across the doors */}
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex"
        style={{ opacity: bandOpacity }}
      >
        <div
          className="h-9 sm:h-11 w-1/2 shadow-[0_6px_18px_rgba(176,85,112,0.28)] transition-none"
          style={{
            transform: `translateX(-${bandShift}%) rotate(${-untie * 4}deg)`,
            background:
              'linear-gradient(180deg, #ffe4ee 0%, #f7c1d0 42%, #e08aa3 72%, #f9dde5 100%)',
          }}
        />
        <div
          className="h-9 sm:h-11 w-1/2 shadow-[0_6px_18px_rgba(176,85,112,0.28)]"
          style={{
            transform: `translateX(${bandShift}%) rotate(${untie * 4}deg)`,
            background:
              'linear-gradient(180deg, #ffe4ee 0%, #f7c1d0 42%, #e08aa3 72%, #f9dde5 100%)',
          }}
        />
      </div>

      {/* Centre bow */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 mt-14 sm:mt-16"
        style={{
          opacity: bowOpacity,
          transform: `translate(-50%, -50%) scale(${bowScale}) rotate(${untie * -18}deg)`,
        }}
      >
        <svg width="150" height="110" viewBox="0 0 150 110" fill="none">
          {/* left loop */}
          <path
            d="M75 48C55 20 18 22 20 48c2 24 38 20 55 0z"
            fill="#f7c1d0"
            stroke="#e08aa3"
            strokeWidth="1.4"
          />
          {/* right loop */}
          <path
            d="M75 48c20-28 57-26 55 0-2 24-38 20-55 0z"
            fill="#f7c1d0"
            stroke="#e08aa3"
            strokeWidth="1.4"
          />
          {/* tails */}
          <path
            d="M70 52 46 100l20-8 6 10z"
            fill="#f9dde5"
            stroke="#e08aa3"
            strokeWidth="1.2"
            style={{ transform: `rotate(${untie * -25}deg)`, transformOrigin: '70px 52px' }}
          />
          <path
            d="M80 52l24 48-20-8-6 10z"
            fill="#f9dde5"
            stroke="#e08aa3"
            strokeWidth="1.2"
            style={{ transform: `rotate(${untie * 25}deg)`, transformOrigin: '80px 52px' }}
          />
          {/* knot */}
          <ellipse cx="75" cy="48" rx="11" ry="9" fill="#e08aa3" />
          <ellipse cx="75" cy="46" rx="6" ry="4" fill="#ffd9e6" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
};
