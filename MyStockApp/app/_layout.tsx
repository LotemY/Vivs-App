// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StartupSound } from '../components/StartupSound';
import { initNotifications } from '../database/notifications';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

export default function RootLayout() {
  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <ThemeProvider>
      <ThemedStack />
      <StartupSound />
    </ThemeProvider>
  );
}

function ThemedStack() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/new" options={{ title: 'Add Product' }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Edit Product' }} />
    </Stack>
  );
}
