// components/ProductForm.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NewProduct, ProductUpdate, Product } from '../types';
import { uploadProductPhoto, deleteProductPhoto } from '../database/photoUpload';

type Props =
  | {
      mode: 'create';
      initial?: undefined;
      onSubmit: (data: NewProduct) => void | Promise<void>;
      submitLabel: string;
    }
  | {
      mode: 'edit';
      initial: Product;
      onSubmit: (data: ProductUpdate) => void | Promise<void>;
      submitLabel: string;
    };

export function ProductForm({ mode, initial, onSubmit, submitLabel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [rateAmount, setRateAmount] = useState('');
  const [rateDays, setRateDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Photo state: `pickedUri` is a local file:// URI from a fresh pick,
  // pending upload on save. `removed` means "clear the existing photo."
  // Neither set = keep whatever initial?.photoUrl already is, untouched.
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const displayedPhotoUri = removed ? null : pickedUri ?? initial?.photoUrl ?? null;

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPickedUri(result.assets[0].uri);
      setRemoved(false);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPickedUri(result.assets[0].uri);
      setRemoved(false);
    }
  }

  function showPhotoOptions() {
    const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
    ];
    if (displayedPhotoUri) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => {
          setPickedUri(null);
          setRemoved(true);
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Product photo', undefined, options);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setSaving(true);

    try {
      let finalPhotoUrl = initial?.photoUrl ?? null;
      let oldPhotoToDelete: string | null = null;

      if (removed) {
        oldPhotoToDelete = initial?.photoUrl ?? null;
        finalPhotoUrl = null;
      } else if (pickedUri) {
        finalPhotoUrl = await uploadProductPhoto(pickedUri);
        oldPhotoToDelete = initial?.photoUrl ?? null;
      }

      const base = {
        name: name.trim(),
        price: price.trim() ? Number(price) : null,
        unit: unit.trim() || null,
        photoUrl: finalPhotoUrl,
        manualOverrideDays: initial?.manualOverrideDays ?? null,
      };

      if (mode === 'create') {
        await onSubmit({
          ...base,
          consumptionRateAmount: rateAmount.trim() ? Number(rateAmount) : null,
          consumptionRateDays: rateDays.trim() ? Number(rateDays) : null,
        });
      } else {
        await onSubmit(base);
      }

      if (oldPhotoToDelete) {
        deleteProductPhoto(oldPhotoToDelete); // best-effort, not awaited
      }
    } catch (err) {
      console.error('Product save failed:', err);
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.photoPicker} onPress={showPhotoOptions}>
        {displayedPhotoUri ? (
          <Image source={{ uri: displayedPhotoUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={28} color="#999" />
            <Text style={styles.photoPlaceholderText}>Add photo</Text>
          </View>
        )}
      </Pressable>

      <Field label="Name">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Paper towels"
          autoFocus={!initial}
        />
      </Field>

      <Field label="Unit">
        <TextInput
          style={styles.input}
          value={unit}
          onChangeText={setUnit}
          placeholder="e.g. rolls, kg, bottle"
        />
      </Field>

      <Field label="Price">
        <View style={styles.priceInputWrap}>
          <Text style={styles.currencyPrefix}>€</Text>
          <TextInput
            style={styles.priceInput}
            value={price}
            onChangeText={setPrice}
            placeholder="6.99"
            keyboardType="decimal-pad"
          />
        </View>
      </Field>

      {mode === 'create' ? (
        <>
          <Text style={styles.sectionLabel}>Consumption rate (optional)</Text>
          <Text style={styles.sectionHint}>
            A starting guess for how fast this gets used — e.g. "3 every 1
            day" for something used daily (12 cookies, eat 3/day), or "1
            every 3 days" for something that lasts a few days per item
            (milk, 1 carton every 3 days). This refines itself automatically
            from real corrections you make in Storage's shopping mode, so
            it's only editable here, once, at creation.
          </Text>
          <View style={styles.rateRow}>
            <View style={styles.rateField}>
              <Text style={styles.label}>Uses</Text>
              <TextInput
                style={styles.input}
                value={rateAmount}
                onChangeText={setRateAmount}
                placeholder="e.g. 3"
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.rateConnector}>every</Text>
            <View style={styles.rateField}>
              <Text style={styles.label}>days</Text>
              <TextInput
                style={styles.input}
                value={rateDays}
                onChangeText={setRateDays}
                placeholder="e.g. 1"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </>
      ) : null}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSubmit} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  photoPicker: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderText: { fontSize: 12, color: '#999' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingLeft: 12,
  },
  currencyPrefix: { fontSize: 16, color: '#555', marginRight: 4 },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
    fontSize: 16,
  },
  error: { color: '#dc2626', marginBottom: 12 },
  sectionLabel: { fontSize: 15, fontWeight: '600', marginTop: 4, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#777', marginBottom: 12, lineHeight: 17 },
  rateRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
  rateField: { flex: 1 },
  rateConnector: { color: '#777', marginBottom: 12, paddingHorizontal: 2 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
