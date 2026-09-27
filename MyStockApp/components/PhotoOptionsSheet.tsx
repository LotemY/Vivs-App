// components/PhotoOptionsSheet.tsx
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../theme/colors';

/**
 * Bottom-sheet replacement for the old Alert.alert-based photo picker.
 * Always shows an obvious X in the top-right so backing out by mistake
 * never risks taking a new photo or removing the current one -- tapping
 * the X (or the backdrop) just closes the sheet and changes nothing.
 */
export function PhotoOptionsSheet({
  visible,
  hasPhoto,
  onTakePhoto,
  onChooseFromLibrary,
  onRemovePhoto,
  onClose,
  colors,
}: {
  visible: boolean;
  hasPhoto: boolean;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onRemovePhoto: () => void;
  onClose: () => void;
  colors: ThemeColors;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Product photo</Text>
            {/* The explicit close affordance the user asked for -- always visible,
                top-right, no accidental destructive action possible. */}
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Pressable
            style={styles.option}
            onPress={() => {
              onClose();
              onTakePhoto();
            }}
          >
            <Ionicons name="camera-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>Take Photo</Text>
          </Pressable>

          <Pressable
            style={styles.option}
            onPress={() => {
              onClose();
              onChooseFromLibrary();
            }}
          >
            <Ionicons name="images-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>
              Choose from Library
            </Text>
          </Pressable>

          {hasPhoto && (
            <Pressable
              style={styles.option}
              onPress={() => {
                onClose();
                onRemovePhoto();
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.optionText, { color: colors.danger }]}>Remove Photo</Text>
            </Pressable>
          )}

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 16, paddingBottom: 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '600' },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  optionText: { fontSize: 16 },
  cancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.25)',
  },
  cancelText: { fontSize: 16, fontWeight: '600' },
});
