export type BannerAlignment = 'left' | 'center' | 'right';
export type BannerOverlay = 'none' | 'dark' | 'gradient' | 'blur';

export interface BannerAction {
  labelKey?: string;
  label?: string;
  type: 'openTitle' | 'openScreen' | 'none';
  target?: string;
}

/**
 * Banner configuration is intentionally separate from media assets:
 * editing text never touches the stored image file (see LibraryAsset).
 */
export interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  assetId?: string;
  imageUri?: string;
  isGif: boolean;
  backgroundColor?: string;
  textColor?: string;
  alignment: BannerAlignment;
  overlay: BannerOverlay;
  action?: BannerAction;
  enabled: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}
