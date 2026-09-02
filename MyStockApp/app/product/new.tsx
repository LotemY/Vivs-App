// app/product/new.tsx
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { ProductForm } from '../../components/ProductForm';
import { createProduct } from '../../database/productRepository';
import type { NewProduct } from '../../types';

export default function NewProductScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  async function handleSubmit(data: NewProduct) {
    await createProduct(db, data);
    router.back();
  }

  return <ProductForm onSubmit={handleSubmit} submitLabel="Add Product" />;
}
