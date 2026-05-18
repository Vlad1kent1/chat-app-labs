import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useRouter, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@hooks/use-color-scheme';
import { store } from '@store';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { initializeAuth, setUserStatus } from '@store/slices/authSlice';
import { connectSocket, disconnectSocket, subscribeStatusChanged } from '@services/modules/socket.service';

import { GluestackUIProvider } from '@ui/gluestack-ui-provider';
import '@/global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isInitialized, user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const segments = useSegments();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log('[LAYOUT] Initializing auth...');
    setIsMounted(true);
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!isMounted || !isInitialized) {
      return;
    }

    const authRouteSegments = ['(auth)', 'login', 'register', 'otp-verification', 'forgot-password', 'reset-password'];
    const isOnAuthRoute = segments.some((segment) => authRouteSegments.includes(segment));

    if (!isAuthenticated && !isOnAuthRoute) {
      console.log('[LAYOUT] Navigating to login');
      router.replace('/login');
    } else if (isAuthenticated && isOnAuthRoute) {
      console.log('[LAYOUT] Navigating to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, isMounted, segments, router]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMountedSocket = true;

    if (isAuthenticated) {
      connectSocket()
        .then((socket) => {
          if (!socket || !isMountedSocket) {
            return;
          }

          unsubscribe = subscribeStatusChanged((payload) => {
            if (payload.userId === user?.id) {
              dispatch(setUserStatus({
                isOnline: payload.isOnline,
                lastSeen: payload.lastSeen,
              }));
            }
          });
        })
        .catch((socketError) => {
          console.warn('[LAYOUT] Socket connection failed', socketError);
        });
    }

    if (!isAuthenticated) {
      disconnectSocket();
    }

    return () => {
      isMountedSocket = false;
      unsubscribe?.();
      disconnectSocket();
    };
  }, [dispatch, isAuthenticated, user?.id]);

  if (!isMounted || !isInitialized) {
    return null; // Shows splash or loading state
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <GluestackUIProvider mode="light"> 
          <AppContent />
        </GluestackUIProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
