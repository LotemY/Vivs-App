// components/ProductForm.tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NewProduct, ProductUpdate, Product } from '../types';
import { uploadProductPhoto, deleteProductPhoto } from '../database/photoUpload';
import { listCategories, listCompanies } from '../database/productRepository';
import { getPricePerReference } from '../database/pricing';
import { useTheme } from '../theme/ThemeContext';
import { PhotoOptionsSheet } from './PhotoOptionsSheet';
import type { ThemeColors } from '../theme/colors';

type Props =
  | {
    mode: 'create';
    initial?: undefined;
    onSubmit: (data: NewProduct) => void | Promise<void>;
    submitLabel: string;
    onCancel?: () => void;
  }
  | {
    mode: 'edit';
    initial: Product;
    onSubmit: (data: ProductUpdate) => void | Promise<void>;
    submitLabel: string;
    onCancel?: () => void;
  };

const PACK_UNIT_TYPES = ['item', 'g', 'ml', 'kg', 'l', 'm', 'cm', 'mm'] as const;

export function ProductForm({ mode, initial, onSubmit, submitLabel, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [company, setCompany] = useState(initial?.company ?? ''); // #6
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [essential, setEssential] = useState(initial?.isEssential ?? false);
  const [category, setCategory] = useState(initial?.category ?? '');
  const [unitsPerPack, setUnitsPerPack] = useState(initial?.unitsPerPack?.toString() ?? '');
  const [packUnitType, setPackUnitType] = useState<Product['packUnitType']>(
    initial?.packUnitType ?? null
  ); // #7
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Photo state: `pickedUri` is a local file:// URI from a fresh pick,
  // pending upload on save. `removed` means "clear the existing photo."
  // Neither set = keep whatever initial?.photoUrl already is, untouched.
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  // Custom sheet replacing Alert.alert -- has an explicit X close button so
  // an accidental tap on the thumbnail can always be backed out of safely.
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const displayedPhotoUri = removed ? null : pickedUri ?? initial?.photoUrl ?? null;

  useEffect(() => {
    listCategories()
      .then(setExistingCategories)
      .catch(() => { }); // non-critical -- suggestions just won't show if this fails
    listCompanies()
      .then(setExistingCompanies)
      .catch(() => { });
  }, []);

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
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
      quality: 0.7,
    });
    if (!result.canceled) {
      setPickedUri(result.assets[0].uri);
      setRemoved(false);
    }
  }

  function removePhoto() {
    setPickedUri(null);
    setRemoved(true);
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

      // #4: consumption rate is no longer collected here at all -- every
      // product starts with none and picks one up automatically after its
      // first real shopping-mode usage correction. Same payload shape now
      // works for both create and edit.
      const payload = {
        name: name.trim(),
        company: company.trim() || null,
        price: price.trim() ? Number(price) : null,
        unit: unit.trim() || null,
        isEssential: essential,
        category: category.trim() || null,
        unitsPerPack: unitsPerPack.trim() ? Number(unitsPerPack) : null,
        packUnitType,
        photoUrl: finalPhotoUrl,
        manualOverrideDays: initial?.manualOverrideDays ?? null,
      };

      await onSubmit(payload);

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

  // Existing categories, minus whatever's already typed -- no point
  // suggesting the one you already have selected.
  const categorySuggestions = existingCategories.filter(
    (c) => c.toLowerCase() !== category.trim().toLowerCase()
  );
  const companySuggestions = existingCompanies.filter(
    (c) => c.toLowerCase() !== company.trim().toLowerCase()
  );

  const priceNum = price.trim() ? Number(price) : null;
  const unitsPerPackNum = unitsPerPack.trim() ? Number(unitsPerPack) : null;
  // #7: normalized price-per-reference (e.g. "1.20 € per 100g"), replacing
  // the old flat price/unitsPerPack division.
  const pricePerReference = getPricePerReference({
    price: priceNum,
    unitsPerPack: unitsPerPackNum,
    packUnitType,
  });

  return (
    <View style={styles.container}>
      <Pressable style={styles.photoPicker} onPress={() => setPhotoSheetOpen(true)}>
        {displayedPhotoUri ? (
          <Image source={{ uri: displayedPhotoUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
            <Text style={styles.photoPlaceholderText}>Add photo</Text>
          </View>
        )}
      </Pressable>

      <PhotoOptionsSheet
        visible={photoSheetOpen}
        hasPhoto={displayedPhotoUri != null}
        onTakePhoto={takePhoto}
        onChooseFromLibrary={pickFromLibrary}
        onRemovePhoto={removePhoto}
        onClose={() => setPhotoSheetOpen(false)}
        colors={colors}
      />

      {/* #6: company split from name -- same "remembers what you typed
          before" chip suggestions as Category, below */}
      <Field colors={colors} label="Company (optional)">
        <TextInput
          style={styles.input}
          value={company}
          onChangeText={setCompany}
          placeholder="e.g. G&G"
          placeholderTextColor={colors.textMuted}
        />
        {companySuggestions.length > 0 && (
          <View style={styles.chipRow}>
            {companySuggestions.map((c) => (
              <Pressable key={c} style={styles.chip} onPress={() => setCompany(c)}>
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Field>

      <Field colors={colors} label="Name">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Vollmilch"
          placeholderTextColor={colors.textMuted}
          autoFocus={!initial}
        />
      </Field>

      <Pressable style={styles.checkboxRow} onPress={() => setEssential((v) => !v)}>
        <Ionicons
          name={essential ? 'checkbox' : 'square-outline'}
          size={22}
          color={essential ? colors.accent : colors.textMuted}
        />
        <Text style={styles.checkboxLabel}>Essential item</Text>
        <Ionicons name="star" size={14} color={colors.accent} style={{ marginLeft: 4 }} />
      </Pressable>

      <Field colors={colors} label="Category">
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. dairy, cleaning, vegetables"
          placeholderTextColor={colors.textMuted}
        />
        {categorySuggestions.length > 0 && (
          <View style={styles.chipRow}>
            {categorySuggestions.map((c) => (
              <Pressable key={c} style={styles.chip} onPress={() => setCategory(c)}>
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Field>

      <Field colors={colors} label="Unit">
        <TextInput
          style={styles.input}
          value={unit}
          onChangeText={setUnit}
          placeholder="e.g. rolls, kg, bottle"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field colors={colors} label="Units per pack (optional)">
        <TextInput
          style={styles.input}
          value={unitsPerPack}
          onChangeText={setUnitsPerPack}
          placeholder="e.g. 500"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
        {/* #7: unit-type selector driving the price-per-reference calculation */}
        <View style={styles.chipRow}>
          {PACK_UNIT_TYPES.map((u) => {
            const active = packUnitType === u;
            return (
              <Pressable
                key={u}
                style={[styles.chip, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => setPackUnitType(u)}
              >
                <Text style={[styles.chipText, active && { color: colors.onAccent }]}>{u}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field colors={colors} label="Price">
        <View style={styles.priceInputWrap}>
          <TextInput
            style={styles.priceInput}
            value={price}
            onChangeText={setPrice}
            placeholder="6.99"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.currencyPrefix}>€</Text>
        </View>
        {pricePerReference && (
          <Text style={styles.pricePerUnitText}>{pricePerReference}</Text>
        )}
      </Field>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actionRow}>
        {onCancel && (
          <Pressable
            style={[styles.actionButton, styles.discardButton]}
            onPress={onCancel}
            disabled={saving}
          >
            <Text style={styles.discardButtonText}>Discard</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.actionButton, styles.button, saving && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.buttonText}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  const styles = makeStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 16 },
    photoPicker: {
      alignSelf: 'center',
      marginBottom: 20,
    },
    photoPreview: {
      width: 100, // 9:16 preview -- was 100x100 square, then 178x100 (landscape by mistake)
      height: 178,
      borderRadius: 12,
    },
    photoPlaceholder: {
      width: 100,
      height: 178,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    photoPlaceholderText: { fontSize: 12, color: colors.textMuted },
    field: { marginBottom: 16 },
    label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surfaceAlt,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
      paddingVertical: 4,
    },
    checkboxLabel: { fontSize: 15, color: colors.textPrimary },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    chipText: { fontSize: 13, color: colors.textSecondary },
    priceInputWrap: {
      alignSelf: 'flex-start',
      width: '50%',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceAlt,
    },
    currencyPrefix: { fontSize: 16, color: colors.textSecondary, marginLeft: 4 },
    priceInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.textPrimary,
    },
    pricePerUnitText: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
    error: { color: colors.danger, marginBottom: 12 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    actionButton: { flex: 1 },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },
    discardButton: {
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    discardButtonText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  });
}
