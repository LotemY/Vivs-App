// components/CategoryColorPicker.tsx
//
// Real saturation/lightness gradient box + hue slider, like a design-tool
// color picker. Needs the `expo-linear-gradient` package (a small native
// module) -- run `npx expo install expo-linear-gradient` once, then rebuild
// with `eas build` for it to work. Everything else here is plain RN
// (PanResponder for the drag gestures), no other new dependencies.
import { useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, StyleSheet, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ThemeColors } from '../theme/colors';

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isValidHex(v: string): boolean {
  return /^#([0-9a-f]{6})$/i.test(v);
}

const BOX_SIZE = 260;
const THUMB = 20;
const SLIDER_HEIGHT = 28;
const SLIDER_THUMB_W = 12;
const HUE_STOPS = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];
const NEUTRALS = ['#ffffff', '#d8d8d8', '#9aa0a6', '#5c5f66', '#2b2d31', '#000000'];

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
  const [hue, setHue] = useState(210); // starting hue -- a blue
  const [pos, setPos] = useState({ x: 0.65, y: 0.3 }); // x = saturation, y = 1-value
  const [hexInput, setHexInput] = useState('');

  // Reset when a fresh category is opened, not on every render.
  const key = category ?? '';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setHexInput('');
    setHue(210);
    setPos({ x: 0.65, y: 0.3 });
  }

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const boxPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setPos({
          x: clamp01(e.nativeEvent.locationX / BOX_SIZE),
          y: clamp01(e.nativeEvent.locationY / BOX_SIZE),
        });
      },
      onPanResponderMove: (e) => {
        setPos({
          x: clamp01(e.nativeEvent.locationX / BOX_SIZE),
          y: clamp01(e.nativeEvent.locationY / BOX_SIZE),
        });
      },
    })
  ).current;

  const sliderPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setHue(clamp01(e.nativeEvent.locationX / BOX_SIZE) * 359.9);
      },
      onPanResponderMove: (e) => {
        setHue(clamp01(e.nativeEvent.locationX / BOX_SIZE) * 359.9);
      },
    })
  ).current;

  const pureHueColor = useMemo(() => hsvToHex(hue, 1, 1), [hue]);
  const pickedColor = useMemo(
    () => hsvToHex(hue, pos.x, 1 - pos.y),
    [hue, pos]
  );

  const normalizedHex = hexInput.trim().startsWith('#') ? hexInput.trim() : `#${hexInput.trim()}`;
  const hexValid = useMemo(() => isValidHex(normalizedHex), [normalizedHex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Color for "{category}"
          </Text>

          {/* Saturation (x) / Value (y) box for the current hue */}
          <View style={styles.box} {...boxPan.panHandlers}>
            <LinearGradient
              colors={['#ffffff', pureHueColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', '#000000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                styles.boxThumb,
                { left: pos.x * BOX_SIZE - THUMB / 2, top: pos.y * BOX_SIZE - THUMB / 2 },
              ]}
            />
          </View>

          {/* Hue slider */}
          <View style={styles.sliderWrap} {...sliderPan.panHandlers}>
            <LinearGradient
              colors={HUE_STOPS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[styles.sliderThumb, { left: (hue / 360) * BOX_SIZE - SLIDER_THUMB_W / 2 }]}
            />
          </View>

          {/* Preview + commit */}
          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, { backgroundColor: pickedColor }]} />
            <Text style={[styles.previewHex, { color: colors.textSecondary }]}>{pickedColor}</Text>
            <Pressable
              style={[styles.useButton, { backgroundColor: colors.accent }]}
              onPress={() => onPick(pickedColor)}
            >
              <Text style={{ color: colors.onAccent, fontWeight: '600' }}>Use</Text>
            </Pressable>
          </View>

          <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Neutrals</Text>
          <View style={styles.neutralsRow}>
            {NEUTRALS.map((c) => (
              <Pressable
                key={c}
                style={[styles.neutralSwatch, { backgroundColor: c, borderColor: colors.border }]}
                onPress={() => onPick(c)}
              />
            ))}
          </View>

          <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
            Or type any hex code
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
  title: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  boxThumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sliderWrap: {
    width: BOX_SIZE,
    height: SLIDER_HEIGHT,
    borderRadius: SLIDER_HEIGHT / 2,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 16,
  },
  sliderThumb: {
    position: 'absolute',
    top: -4,
    width: SLIDER_THUMB_W,
    height: SLIDER_HEIGHT + 8,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    alignSelf: 'center',
    width: BOX_SIZE,
  },
  previewSwatch: { width: 40, height: 40, borderRadius: 10 },
  previewHex: { flex: 1, fontSize: 15 },
  subLabel: { fontSize: 12, marginTop: 18, marginBottom: 8 },
  neutralsRow: { flexDirection: 'row', gap: 10 },
  neutralSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
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
