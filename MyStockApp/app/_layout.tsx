// app/_layout.tsx
import { Stack } from 'expo-router';
import { DatabaseProvider } from '../database/DatabaseProvider';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/new" options={{ title: 'Add Product' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Edit Product' }} />
      </Stack>
    </DatabaseProvider>
  );
}
