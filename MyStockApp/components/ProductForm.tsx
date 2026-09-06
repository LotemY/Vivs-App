// components/ProductForm.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { NewProduct, ProductUpdate, Product } from '../types';

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

  function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);

    const base = {
      name: name.trim(),
      price: price.trim() ? Number(price) : null,
      unit: unit.trim() || null,
      photoUrl: initial?.photoUrl ?? null, // photo picking arrives in Section 6
      manualOverrideDays: initial?.manualOverrideDays ?? null,
    };

    if (mode === 'create') {
      onSubmit({
        ...base,
        consumptionRateAmount: rateAmount.trim() ? Number(rateAmount) : null,
        consumptionRateDays: rateDays.trim() ? Number(rateDays) : null,
      });
    } else {
      onSubmit(base);
    }
  }

  return (
    <View style={styles.container}>
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

      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>{submitLabel}</Text>
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
});
