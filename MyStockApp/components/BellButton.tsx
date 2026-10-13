// components/BellButton.tsx
import { useCallback, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { countUnseenEvents } from '../database/eventRepository';
import { useTheme } from '../theme/ThemeContext';

/** Bell for the header: opens the history screen, badge = events this phone hasn't seen yet. */
export function BellButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const [unseen, setUnseen] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      countUnseenEvents().then((n) => alive && setUnseen(n));
      return () => {
        alive = false;
      };
    }, [])
  );

  return (
    <Pressable
      onPress={() => router.push('/history')}
      hitSlop={10}
      style={styles.button}
      accessibilityLabel="Notifications and history"
    >
      <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
      {unseen > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.badgeText, { color: colors.onAccent }]}>
            {unseen > 9 ? '9+' : unseen}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { marginRight: 16 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
