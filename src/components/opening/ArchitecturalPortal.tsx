import React from 'react';

interface ArchitecturalPortalProps {
  doorProgress: number; // 0 (closed) to 1 (fully open)
  onClickDoor?: () => void;
  isStarted?: boolean;
}

export const ArchitecturalPortal: React.FC<ArchitecturalPortalProps> = ({
  doorProgress,
  onClickDoor,
  isStarted = false,
}) => {
  // Smooth horizontal sliding transforms for the left and right doors
  const leftDoorTranslateX = -doorProgress * 102; // Slide completely to the left (-102%)
  const rightDoorTranslateX = doorProgress * 102; // Slide completely to the right (+102%)

  return (
    <div
      onClick={onClickDoor}
      className={`relative w-full h-full min-h-screen flex flex-col items-center justify-center select-none overflow-hidden ${
        !isStarted ? 'cursor-pointer group' : ''
      }`}
    >
      {/* ========================================================
          BACKGROUND: BESPOKE WHITE & PASTEL BABY PINK PALACE SCENE
          ======================================================== */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-[#fff5f9]">
        <img
          src="/assets/fancy_garden_palace.webp"
          alt="Royal Fairytale Garden Palace"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="w-full h-full object-cover object-center transform-gpu"
        />
      </div>

      {/* ========================================================
          SLIDING ROYAL PALACE DOUBLE DOORS (CLEAN, ZERO GLOW)
          ======================================================== */}
      <div className="absolute inset-0 z-20 flex overflow-hidden">
        {/* LEFT DOOR SLIDING LEAF */}
        <div
          className="relative w-1/2 h-full transition-transform duration-75 overflow-hidden transform-gpu"
          style={{
            transform: `translateX(${leftDoorTranslateX}%)`,
            willChange: 'transform',
          }}
        >
          <img
            src="/assets/fancy_door_left.webp"
            alt="Royal French Left Door"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="w-full h-full object-cover object-center transform-gpu"
          />

          {/* Left Half of Central S&S Logo Handle (Mathematically Centered & Perfectly Symmetrical) */}
          <div
            className="absolute right-0 top-[58%] -translate-y-1/2 pointer-events-none z-30 flex items-center justify-end"
            style={{
              width: '48px',
              height: '96px',
            }}
          >
            <img
              src="/assets/door_handle_crest_left.webp"
              alt="S&S Logo Left"
              loading="eager"
              decoding="sync"
              className="w-full h-full object-contain object-right"
            />
          </div>
        </div>

        {/* RIGHT DOOR SLIDING LEAF */}
        <div
          className="relative w-1/2 h-full transition-transform duration-75 overflow-hidden transform-gpu"
          style={{
            transform: `translateX(${rightDoorTranslateX}%)`,
            willChange: 'transform',
          }}
        >
          <img
            src="/assets/fancy_door_right.webp"
            alt="Royal French Right Door"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="w-full h-full object-cover object-center transform-gpu"
          />

          {/* Right Half of Central S&S Logo Handle (Mathematically Centered & Perfectly Symmetrical) */}
          <div
            className="absolute left-0 top-[58%] -translate-y-1/2 pointer-events-none z-30 flex items-center justify-start"
            style={{
              width: '48px',
              height: '96px',
            }}
          >
            <img
              src="/assets/door_handle_crest_right.webp"
              alt="S&S Logo Right"
              loading="eager"
              decoding="sync"
              className="w-full h-full object-contain object-left"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

