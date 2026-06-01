import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Services } from '@/presentation/services';

// Fires session_started on initial mount and each time the app returns to the
// foreground (active). Fires session_completed when the app goes to background.
// This is the primary event source for PostHog D7/D30 retention cohorts.
//
// Place in the root layout so it runs for the entire app lifetime.
// Only hooks up when services are ready (container resolved).
export function useSessionLifecycle(services: Services | null): void {
  const isFirstForeground = useRef(true);

  useEffect(() => {
    if (!services) return;

    // Fire session_started on initial mount (cold launch or first services resolve).
    void services.session.start();
    isFirstForeground.current = false;

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App came back to foreground — new session.
        void services.session.start();
      } else if (nextState === 'background' || nextState === 'inactive') {
        void services.session.end();
      }
    });

    return () => {
      sub.remove();
    };
  }, [services]);
}
