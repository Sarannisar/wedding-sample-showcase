import React from 'react';

interface ArchitecturalPortalProps {
  doorProgress: number; // 0 (closed) to 1 (fully open)
  glowProgress?: number; // 0 (no glow) to 1 (full glow)
  onClickDoor?: () => void;
  isStarted?: boolean;
}

export const ArchitecturalPortal: React.FC<ArchitecturalPortalProps> = ({
  doorProgress,
  glowProgress = 0,
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
      <div className="absolute inset-0 overflow-hidden shadow-2xl flex items-center justify-center bg-[#fff5f9]">
        <img
          src="/assets/fancy_garden_palace.jpg"
          alt="Royal Fairytale Garden Palace"
          className="w-full h-full object-cover object-center"
        />

        {/* Soft Ambient Sunlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-[#fffafc]/35 pointer-events-none" />
      </div>

      {/* ========================================================
          GLOWING DOOR SEAM & LOGO RADIANCE EFFECT BEFORE OPENING
          ======================================================== */}
      {doorProgress < 0.9 && (
        <>
          {/* Vertical Seam Light Tracer */}
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-2 pointer-events-none z-35 transition-opacity duration-200"
            style={{
              opacity:
                doorProgress > 0
                  ? Math.max(0, 1 - doorProgress * 3.5)
                  : glowProgress > 0
                  ? glowProgress
                  : 0.15,
            }}
          >
            {/* Brilliant Vertical Seam Beam */}
            <div className="w-full h-full bg-gradient-to-b from-transparent via-[#fff0f5] to-transparent shadow-[0_0_24px_6px_#f2b8c6]" />
          </div>

          {/* Central Logo Radiance Glow Bloom */}
          <div
            className="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-25 transition-all duration-300"
            style={{
              width: `${190 + glowProgress * 120}px`,
              height: `${190 + glowProgress * 120}px`,
              opacity:
                doorProgress > 0
                  ? Math.max(0, 1 - doorProgress * 2.5)
                  : glowProgress > 0
                  ? glowProgress
                  : 0.35,
              background:
                'radial-gradient(circle, rgba(255,235,242,0.95) 0%, rgba(247,193,208,0.6) 45%, transparent 72%)',
              filter: 'blur(16px)',
            }}
          />
        </>
      )}

      {/* ========================================================
          SLIDING ROYAL PALACE DOUBLE DOORS WITH PEARL ESCUTCHEON
          ======================================================== */}
      <div className="absolute inset-0 z-20 flex overflow-hidden">
        {/* LEFT DOOR SLIDING LEAF */}
        <div
          className="relative w-1/2 h-full transition-transform duration-75 overflow-hidden transform-gpu"
          style={{
            transform: `translateX(${leftDoorTranslateX}%)`,
            willChange: 'transform',
            boxShadow:
              doorProgress > 0.02
                ? `12px 0 35px rgba(224, 138, 163, ${0.45 - doorProgress * 0.3})`
                : 'none',
          }}
        >
          <img
            src="/assets/fancy_door_left.jpg"
            alt="Royal French Left Door"
            className="w-full h-full object-cover object-center"
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
              src="/assets/door_handle_crest_left.png"
              alt="S&S Logo Left"
              className="w-full h-full object-contain object-right drop-shadow-lg"
            />
          </div>
        </div>

        {/* RIGHT DOOR SLIDING LEAF */}
        <div
          className="relative w-1/2 h-full transition-transform duration-75 overflow-hidden transform-gpu"
          style={{
            transform: `translateX(${rightDoorTranslateX}%)`,
            willChange: 'transform',
            boxShadow:
              doorProgress > 0.02
                ? `-12px 0 35px rgba(224, 138, 163, ${0.45 - doorProgress * 0.3})`
                : 'none',
          }}
        >
          <img
            src="/assets/fancy_door_right.jpg"
            alt="Royal French Right Door"
            className="w-full h-full object-cover object-center"
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
              src="/assets/door_handle_crest_right.png"
              alt="S&S Logo Right"
              className="w-full h-full object-contain object-left drop-shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

