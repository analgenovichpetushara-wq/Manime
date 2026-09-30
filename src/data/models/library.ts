export type LibraryAssetKind = 'image' | 'gif';

export interface LibraryAsset {
  id: string;
  name: string;
  uri: string;
  /** Original file kept untouched; thumbnails are derived, never rewritten. */
  originalUri: string;
  thumbnailUri?: string;
  kind: LibraryAssetKind;
  width?: number;
  height?: number;
  sizeBytes?: number;
  importedAt: number;
  usedAsAvatar?: boolean;
  usedAsBanner?: boolean;
  usedAsBackground?: boolean;
}
