/**
 * Shadow Mission Shell — short, ease-out motion. Durations stay ≤ ~300ms.
 * Pair with <MotionConfig reducedMotion="user"> in the app root.
 */

export const SHELL_EASE = [0.25, 0.1, 0.25, 1] as const;

export const DURATION_FAST_S = 0.14;
export const DURATION_MEDIUM_S = 0.22;

export const shellTransition = {
  duration: DURATION_FAST_S,
  ease: SHELL_EASE,
};

export const shellTransitionMedium = {
  duration: DURATION_MEDIUM_S,
  ease: SHELL_EASE,
};

/** Capped list stagger: extra rows share the same delay so the cascade does not grow without bound. */
export function staggerDelay(index: number, stepS = 0.032, maxS = 0.192): number {
  return Math.min(index * stepS, maxS);
}
