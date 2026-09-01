import { useState, useEffect } from 'react';

export interface AmbientPerformanceState {
  /** True when the tab is visible and active */
  isActive: boolean;
  /** True if user requested reduced motion */
  prefersReducedMotion: boolean;
  /** True on low-power / lower-core devices (e.g. mobile or <= 4 CPU threads) */
  isLowPowerDevice: boolean;
  /** Recommended count of floating petals/particles */
  petalCount: number;
}

export function useAmbientActive(): AmbientPerformanceState {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const [isLowPowerDevice] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const cores = navigator.hardwareConcurrency || 4;
    return cores <= 4;
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMotionChange);
      }
    };
  }, []);

  const petalCount = prefersReducedMotion
    ? 0
    : !isVisible
    ? 0
    : isLowPowerDevice
    ? 8
    : 16;

  return {
    isActive: isVisible && !prefersReducedMotion,
    prefersReducedMotion,
    isLowPowerDevice,
    petalCount,
  };
}
