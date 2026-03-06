import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Animated,
  Image,
  AppState,
  AppStateStatus,
  View,
} from 'react-native';

const SPLASH_DURATION = 1800; // ms to show on foreground return
const FADE_DURATION = 400;

/**
 * Full-screen splash overlay that shows briefly whenever
 * the app returns from the background.
 * Matches the native splash screen design (dark bg + logo).
 */
export default function SplashOverlay() {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      // App came from background/inactive → active
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        // Show overlay
        setVisible(true);
        opacity.setValue(1);

        // After brief display, fade out
        const timer = setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        }, SPLASH_DURATION);

        // Clean up if state changes again before timeout
        appState.current = next;
        return () => clearTimeout(timer);
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Image
        source={require('../assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1F1A15',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logo: {
    width: 200,
    height: 200,
  },
});
