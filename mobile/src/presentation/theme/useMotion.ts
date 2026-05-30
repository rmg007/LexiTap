import { type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';
import { useReduceMotion } from '@/presentation/theme/ThemeProvider';
import { useTheme } from '@/presentation/theme/ThemeProvider';
import type { Springs } from '@/presentation/theme/tokens';

// useMotion — animation config factory that respects the OS Reduce Motion
// accessibility setting. When reduceMotion is true, all animations become
// instant (duration: 0) cross-fades instead of springs, preventing motion
// sickness and respecting the user's explicit preference.

export interface MotionHook {
  /**
   * Returns a spring config for the named preset.
   * When reduceMotion is true, returns a zero-duration timing config instead.
   */
  spring: (preset: keyof Springs) => WithSpringConfig | WithTimingConfig;
  /**
   * Returns a timing config using the named motion token duration.
   * When reduceMotion is true, returns duration: 0.
   */
  timing: (token: 'fast' | 'base' | 'slow') => WithTimingConfig;
  /** True when Reduce Motion is active — use for conditional rendering. */
  reduceMotion: boolean;
}

export function useMotion(): MotionHook {
  const { motion, springs } = useTheme();
  const reduceMotion = useReduceMotion();

  function spring(preset: keyof Springs): WithSpringConfig | WithTimingConfig {
    if (reduceMotion) return { duration: 0 };
    return springs[preset];
  }

  function timing(token: 'fast' | 'base' | 'slow'): WithTimingConfig {
    if (reduceMotion) return { duration: 0 };
    return { duration: motion[token] };
  }

  return { spring, timing, reduceMotion };
}
