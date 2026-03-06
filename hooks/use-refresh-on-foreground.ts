import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Calls `onForeground` whenever the app returns from background to active.
 * Useful for refetching data that may have changed while the app was suspended.
 */
export function useRefreshOnForeground(onForeground: () => void) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      // Trigger when transitioning from background/inactive → active
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        onForeground();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [onForeground]);
}
