// components/PhotoViewer.tsx
import { Modal, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Full-screen photo viewer. Pass the currently-viewed photo's URI (or null
 * to keep it closed); tapping anywhere, or the close button, dismisses it.
 */
export function PhotoViewer({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={uri != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '80%' },
  closeButton: { position: 'absolute', top: 48, right: 20 },
});
