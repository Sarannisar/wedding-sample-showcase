import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface ArchitecturalPortalHandle {
  leftDoor: HTMLDivElement | null;
  rightDoor: HTMLDivElement | null;
}

interface ArchitecturalPortalProps {
  onClickDoor?: () => void;
  isStarted?: boolean;
}

export const ArchitecturalPortal = forwardRef<ArchitecturalPortalHandle, ArchitecturalPortalProps>(
  ({ onClickDoor, isStarted = false }, ref) => {
    const leftDoorRef = useRef<HTMLDivElement>(null);
    const rightDoorRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      leftDoor: leftDoorRef.current,
      rightDoor: rightDoorRef.current,
    }));

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
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-[#fff5f9] pointer-events-none">
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
            SLIDING ROYAL PALACE DOUBLE DOORS (CLEAN, HARDWARE ACCELERATED)
            ======================================================== */}
        <div className="absolute inset-0 z-20 flex overflow-hidden pointer-events-none">
          {/* LEFT DOOR SLIDING LEAF */}
          <div
            ref={leftDoorRef}
            className="relative w-1/2 h-full overflow-hidden transform-gpu"
            style={{
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
            }}
          >
            <img
              src="/assets/fancy_door_left.webp"
              alt="Royal French Left Door"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              className="w-full h-full object-cover object-center transform-gpu select-none"
            />

            {/* Left Half of Central S&S Logo Handle */}
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
                className="w-full h-full object-contain object-right select-none"
              />
            </div>
          </div>

          {/* RIGHT DOOR SLIDING LEAF */}
          <div
            ref={rightDoorRef}
            className="relative w-1/2 h-full overflow-hidden transform-gpu"
            style={{
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
            }}
          >
            <img
              src="/assets/fancy_door_right.webp"
              alt="Royal French Right Door"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              className="w-full h-full object-cover object-center transform-gpu select-none"
            />

            {/* Right Half of Central S&S Logo Handle */}
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
                className="w-full h-full object-contain object-left select-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
ArchitecturalPortal.displayName = 'ArchitecturalPortal';


