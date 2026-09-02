// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/new" options={{ title: 'Add Product' }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Edit Product' }} />
    </Stack>
  );
}
