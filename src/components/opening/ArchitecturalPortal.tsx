import React from 'react';
import { DoorGlowTracer } from './DoorGlowTracer';
import { DoorRibbon } from './DoorRibbon';

interface ArchitecturalPortalProps {
  doorProgress: number; // 0 (closed) to 1 (fully open)
  onClickDoor?: () => void;
  isStarted?: boolean;
  ribbonUntie?: number; // 0 (tied) to 1 (fully untied)
}

export const ArchitecturalPortal: React.FC<ArchitecturalPortalProps> = ({
  doorProgress,
  onClickDoor,
  isStarted = false,
  ribbonUntie = 0,
}) => {
  // Smooth horizontal sliding transforms for the left and right doors
  const leftDoorTranslateX = -doorProgress * 102; // Slide completely to the left (-102%)
  const rightDoorTranslateX = doorProgress * 102; // Slide completely to the right (+102%)


  return (
    <div
      onClick={onClickDoor}
      className={`relative w-full h-full min-h-screen md:max-w-[460px] md:h-[92vh] md:min-h-0 md:rounded-3xl flex flex-col items-center justify-center select-none overflow-hidden ${
        !isStarted ? 'cursor-pointer group' : ''
      }`}
    >
      {/* ========================================================
          BACKGROUND: BESPOKE FAIRYTALE PALACE GARDEN COLONNADE
          ======================================================== */}
      <div className="absolute inset-0 overflow-hidden shadow-2xl flex items-center justify-center bg-[#eed0d9]">
        <img
          src="/assets/fancy_garden_palace.jpg"
          alt="Royal Fairytale Garden Palace"
          className="w-full h-full object-cover object-center"
        />

        {/* Soft Ambient Sunlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-[#fffafc]/25 pointer-events-none" />
      </div>

      {/* ========================================================
          SLIDING ROYAL PALACE DOUBLE DOORS WITH CENTER S&S HANDLE
          ======================================================== */}
      <div className="absolute inset-0 z-20 flex overflow-hidden">
        {/* LEFT DOOR SLIDING LEAF */}
        <div
          className="relative w-1/2 h-full transition-transform duration-75 overflow-hidden"
          style={{
            transform: `translateX(${leftDoorTranslateX}%)`,
            boxShadow:
              doorProgress > 0.02
                ? `10px 0 30px rgba(0, 0, 0, ${0.35 - doorProgress * 0.2})`
                : 'none',
          }}
        >
          <img
            src="/assets/fancy_door_left.jpg"
            alt="Royal French Left Door"
            className="w-full h-full object-cover object-center"
          />

          {/* Left Half of Central S&S Logo Handle */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-r-0 border-[#f2b8c6] bg-white shadow-2xl z-30 pointer-events-none flex items-center justify-center">
            <img
              src="/assets/logo_saad_sheen_crest.jpg"
              alt="S&S Logo Handle"
              className="w-full h-full object-cover scale-110"
            />
          </div>
        </div>

        {/* RIGHT DOOR SLIDING LEAF */}
        <div
          className="relative w-1/2 h-full transition-transform duration-75 overflow-hidden"
          style={{
            transform: `translateX(${rightDoorTranslateX}%)`,
            boxShadow:
              doorProgress > 0.02
                ? `-10px 0 30px rgba(0, 0, 0, ${0.35 - doorProgress * 0.2})`
                : 'none',
          }}
        >
          <img
            src="/assets/fancy_door_right.jpg"
            alt="Royal French Right Door"
            className="w-full h-full object-cover object-center"
          />

          {/* Right Half of Central S&S Logo Handle */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-l-0 border-[#f2b8c6] bg-white shadow-2xl z-30 pointer-events-none flex items-center justify-center">
            <img
              src="/assets/logo_saad_sheen_crest.jpg"
              alt="S&S Logo Handle"
              className="w-full h-full object-cover scale-110"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
