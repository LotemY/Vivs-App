// components/CategoryColorPicker.tsx
import { useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import type { ThemeColors } from '../theme/colors';

// A generated palette + free-hex input rather than a color-wheel library,
// deliberately -- a real wheel-picker package needs native code and a fresh
// EAS build. This is pure JS/RN math (HSL -> hex), works immediately on the
// dev client with no rebuild, and covers effectively unlimited colors via
// the hex field below the grid.
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// 12 hues around the wheel x 3 shades (bright / mid / deep) = 36 swatches,
// plus grayscale, all generated -- this is what makes it feel like a wheel
// rather than a fixed, small palette.
const HUES = Array.from({ length: 12 }, (_, i) => i * 30);
const SHADES: { s: number; l: number }[] = [
  { s: 85, l: 60 }, // bright
  { s: 75, l: 45 }, // mid
  { s: 70, l: 30 }, // deep
];
const WHEEL = SHADES.flatMap((shade) => HUES.map((h) => hslToHex(h, shade.s, shade.l)));
const GRAYSCALE = ['#95a5a6', '#7f8c8d', '#636e72', '#2d3436', '#dfe6e9'];

function isValidHex(v: string): boolean {
  return /^#([0-9a-f]{6})$/i.test(v);
}

export function CategoryColorPicker({
  visible,
  category,
  onPick,
  onClose,
  colors,
}: {
  visible: boolean;
  category: string | null;
  onPick: (color: string) => void;
  onClose: () => void;
  colors: ThemeColors;
}) {
  const [hexInput, setHexInput] = useState('');

  // Reset the hex field each time a fresh category is opened, not on every render.
  const key = category ?? '';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setHexInput('');
  }

  const normalizedHex = hexInput.trim().startsWith('#') ? hexInput.trim() : `#${hexInput.trim()}`;
  const hexValid = useMemo(() => isValidHex(normalizedHex), [normalizedHex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Color for "{category}"
          </Text>

          <ScrollView style={styles.scroll}>
            <View style={styles.grid}>
              {WHEEL.map((c, i) => (
                <Pressable
                  key={`${c}-${i}`}
                  style={[styles.swatch, { backgroundColor: c }]}
                  onPress={() => onPick(c)}
                />
              ))}
              {GRAYSCALE.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.swatch, { backgroundColor: c }]}
                  onPress={() => onPick(c)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.hexLabel, { color: colors.textSecondary }]}>
            Or type any hex code:
          </Text>
          <View style={styles.hexRow}>
            <View
              style={[
                styles.hexPreview,
                { backgroundColor: hexValid ? normalizedHex : colors.surfaceAlt },
              ]}
            />
            <TextInput
              style={[styles.hexInput, { color: colors.textPrimary, borderColor: colors.border }]}
              value={hexInput}
              onChangeText={setHexInput}
              placeholder="#3498db"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
            />
            <Pressable
              style={[
                styles.useButton,
                { backgroundColor: hexValid ? colors.accent : colors.border },
              ]}
              disabled={!hexValid}
              onPress={() => onPick(normalizedHex)}
            >
              <Text style={{ color: colors.onAccent, fontWeight: '600' }}>Use</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 20, paddingBottom: 28, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  scroll: { maxHeight: 260 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 4 },
  swatch: { width: 38, height: 38, borderRadius: 19 },
  hexLabel: { fontSize: 13, marginTop: 16, marginBottom: 8 },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hexPreview: { width: 32, height: 32, borderRadius: 8 },
  hexInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  useButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
