import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, ActivityIndicator, View } from 'react-native';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth-provider';
import { Colors } from '@/constants/colors';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/schedule');
    }
  }, [session, isLoading, segments]);

  return <>{children}</>;
}

/**
 * Sets up a listener for push notification taps on native platforms.
 * When a user taps a notification with a class_instance_id in its data,
 * navigates them to the corresponding class detail screen.
 * This is a no-op on web since push notifications aren't supported there.
 */
function useNotificationResponse() {
  const router = useRouter();
  const { session } = useAuth();
  const subscriptionRef = useRef<{ remove(): void } | null>(null);

  useEffect(() => {
    // Push notifications are native-only; skip entirely on web
    if (Platform.OS === 'web' || !session) return;

    // Lazy require to avoid pulling expo-notifications into the web bundle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');

    subscriptionRef.current =
      Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const data = response?.notification?.request?.content?.data;
          if (data?.class_instance_id) {
            router.push(`/class/${data.class_instance_id}`);
          }
        }
      );

    return () => {
      try {
        subscriptionRef.current?.remove();
      } catch {
        // Ignore cleanup errors on web shim
      }
      subscriptionRef.current = null;
    };
  }, [session, router]);
}

function NotificationHandler() {
  useNotificationResponse();
  return null;
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded] = useFonts({
    'CormorantGaramond': require('../assets/fonts/CormorantGaramond-Regular.ttf'),
    'Jost-Light': require('../assets/fonts/Jost-Light.ttf'),
    'Jost': require('../assets/fonts/Jost-Regular.ttf'),
  });

  // Hold splash screen for at least 2 seconds, then wait for fonts
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Hide splash when both fonts are loaded and minimum time has passed
  useEffect(() => {
    if (fontsLoaded && appReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appReady]);

  if (!fontsLoaded || !appReady) {
    return null; // Keep showing native splash screen
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <NotificationHandler />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="class/[id]"
            options={{
              headerShown: true,
              headerTitle: '',
              headerBackTitle: 'Back',
              headerStyle: { backgroundColor: Colors.background },
              headerTintColor: Colors.text,
            }}
          />
        </Stack>
      </AuthGuard>
      <StatusBar style="light" />
    </AuthProvider>
  );
}
