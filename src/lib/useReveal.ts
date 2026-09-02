import { useReducedMotion } from 'framer-motion';

export function useReveal(margin = '-80px') {
  const prefersReducedMotion = useReducedMotion();

  return {
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 },
    whileInView: prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    viewport: { once: true, margin },
    transition: {
      duration: prefersReducedMotion ? 0.3 : 0.7,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  };
}
