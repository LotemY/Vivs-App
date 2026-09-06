// database/photoUpload.ts
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabaseClient';

const BUCKET = 'product-photos';

/**
 * Uploads a locally-picked photo (from expo-image-picker) to Supabase
 * Storage and returns its public URL.
 *
 * React Native's fetch/Blob support is unreliable for local file:// URIs,
 * so this reads the file as base64 via expo-file-system and decodes it to
 * an ArrayBuffer for upload instead -- the standard, reliable pattern for
 * Expo + Supabase Storage.
 */
export async function uploadProductPhoto(localUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const extMatch = localUri.match(/\.(\w+)$/);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Best-effort cleanup of a photo that's been replaced or removed.
 * Deliberately doesn't throw -- a failed cleanup shouldn't block saving
 * the product itself, it just means one orphaned file in storage.
 */
export async function deleteProductPhoto(photoUrl: string): Promise<void> {
  try {
    const match = photoUrl.match(new RegExp(`${BUCKET}/(.+)$`));
    if (!match) return;
    await supabase.storage.from(BUCKET).remove([match[1]]);
  } catch (err) {
    console.warn('Could not delete old product photo:', err);
  }
}
