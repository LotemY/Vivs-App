// app/product/new.tsx
import { KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductForm } from '../../components/ProductForm';
import { createProduct } from '../../database/productRepository';
import type { NewProduct } from '../../types';

export default function NewProductScreen() {
  const router = useRouter();

  async function handleSubmit(data: NewProduct) {
    await createProduct(data);
    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        <ProductForm
          mode="create"
          onSubmit={handleSubmit}
          submitLabel="Add Product"
          onCancel={() => router.back()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
