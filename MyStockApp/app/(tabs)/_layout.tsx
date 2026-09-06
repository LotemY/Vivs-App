// app/(tabs)/_layout.tsx
import { Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { THEME_ICON } from '../../theme/colors';

export default function TabsLayout() {
  const { colors, themeName, cycleTheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" color={color} size={size} />
          ),
          headerRight: () => (
            <Pressable
              onPress={cycleTheme}
              accessibilityLabel="Switch theme"
              style={{ marginRight: 16, padding: 4 }}
            >
              <Ionicons name={THEME_ICON[themeName]} size={20} color={colors.textSecondary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="storage"
        options={{
          title: 'Storage',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
