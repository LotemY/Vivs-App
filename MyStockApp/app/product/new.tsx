// app/product/new.tsx
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

  return <ProductForm mode="create" onSubmit={handleSubmit} submitLabel="Add Product" />;
}
