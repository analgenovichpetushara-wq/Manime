import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppError } from '@/core/errors/AppError';
import { createId } from '@/core/utils/id';
import { libraryActions, useLibraryStore } from '@/store/collectionsStores';
import type { LibraryAsset, LibraryAssetKind } from '@/data/models/library';
import { createLogger } from '@/core/logging/logger';

const log = createLogger('media');

const LIBRARY_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}animalc/library/` : null;
const THUMB_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}animalc/thumbnails/` : null;

export interface PickedMedia {
  uri: string;
  name: string;
  isGif: boolean;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

async function ensureDirectories(): Promise<void> {
  if (!LIBRARY_DIR) return;
  const info = await FileSystem.getInfoAsync(LIBRARY_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(LIBRARY_DIR, { intermediates: true });
  if (THUMB_DIR) {
    const thumbInfo = await FileSystem.getInfoAsync(THUMB_DIR);
    if (!thumbInfo.exists) await FileSystem.makeDirectoryAsync(THUMB_DIR, { intermediates: true });
  }
}

function extensionOf(uri: string): string {
  const match = /\.[a-z0-9]+$/i.exec(uri.split('?')[0] ?? '');
  return match ? match[0].toLowerCase() : '.jpg';
}

export function isGifUri(uri: string, reportedMimeType?: string | null): boolean {
  if (reportedMimeType === 'image/gif') return true;
  return extensionOf(uri) === '.gif';
}

/** Opens the system gallery; returns null when the user cancels. */
export async function pickFromGallery(options: { allowMultiple?: boolean; mediaTypes?: 'images' } = {}): Promise<PickedMedia[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AppError({
      code: 'PERMISSION_DENIED',
      message: 'gallery permission denied',
    });
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: options.mediaTypes === 'images' ? ['images'] : ['images'],
    allowsMultipleSelection: options.allowMultiple ?? false,
    quality: 1,
    exif: false,
    allowsEditing: false,
  });
  if (result.canceled) return null;
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.fileName ?? asset.uri.split('/').pop() ?? 'media',
    isGif: isGifUri(asset.uri, asset.mimeType),
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.fileSize,
  }));
}

/**
 * Copies the picked file into the app's document directory.
 * The original file is never rewritten — banners/avatars only reference it.
 */
export async function importToLibrary(picked: PickedMedia): Promise<LibraryAsset> {
  let storedUri = picked.uri;
  try {
    await ensureDirectories();
    if (LIBRARY_DIR) {
      const target = `${LIBRARY_DIR}${createId('asset')}${extensionOf(picked.uri)}`;
      await FileSystem.copyAsync({ from: picked.uri, to: target });
      storedUri = target;
    }
  } catch (error) {
    log.warn('copy failed, keeping original uri', { error: String(error) });
  }

  const kind: LibraryAssetKind = picked.isGif ? 'gif' : 'image';
  const asset = libraryActions.addAsset({
    name: picked.name,
    uri: storedUri,
    originalUri: picked.uri,
    thumbnailUri: storedUri,
    kind,
    width: picked.width,
    height: picked.height,
    sizeBytes: picked.sizeBytes,
  });
  return asset;
}

/** Gallery → library → selection in one step (used by profile and banners). */
export async function pickAndImport(allowMultiple = false): Promise<LibraryAsset[] | null> {
  const picked = await pickFromGallery({ allowMultiple });
  if (!picked) return null;
  const assets: LibraryAsset[] = [];
  for (const item of picked) {
    assets.push(await importToLibrary(item));
  }
  return assets;
}

export async function deleteLibraryAsset(assetId: string): Promise<void> {
  const asset = useLibraryStore.getState().assets.find((item) => item.id === assetId);
  libraryActions.removeAsset(assetId);
  if (!asset) return;
  // Only remove managed copies, never the user's original gallery file.
  if (LIBRARY_DIR && asset.uri.startsWith(LIBRARY_DIR)) {
    try {
      await FileSystem.deleteAsync(asset.uri, { idempotent: true });
    } catch (error) {
      log.warn('delete failed', { error: String(error) });
    }
  }
}

export async function libraryPreviewSource(asset: LibraryAsset): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (!info.exists && asset.originalUri) return asset.originalUri;
  } catch {
    return asset.originalUri;
  }
  return asset.uri;
}

export function isAnimated(asset: LibraryAsset): boolean {
  return asset.kind === 'gif';
}
