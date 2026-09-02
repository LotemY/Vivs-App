// components/ProductForm.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { NewProduct, Product } from '../types';

interface Props {
  initial?: Product;
  onSubmit: (data: NewProduct) => void | Promise<void>;
  submitLabel: string;
}

export function ProductForm({ initial, onSubmit, submitLabel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      price: price.trim() ? Number(price) : null,
      unit: unit.trim() || null,
      quantity: quantity.trim() ? Number(quantity) : null,
      photoUrl: initial?.photoUrl ?? null, // photo picking arrives in Section 6
      manualOverrideDays: initial?.manualOverrideDays ?? null,
    });
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

      <Field label="Quantity on hand">
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 2"
          keyboardType="decimal-pad"
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
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="e.g. 6.99"
          keyboardType="decimal-pad"
        />
      </Field>

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
  error: { color: '#dc2626', marginBottom: 12 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
