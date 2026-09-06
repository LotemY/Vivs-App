// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initNotifications } from '../database/notifications';

export default function RootLayout() {
  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/new" options={{ title: 'Add Product' }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Edit Product' }} />
    </Stack>
  );
}
