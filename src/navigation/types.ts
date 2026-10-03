import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AnimeTitle } from '@/data/models/anime';

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Lists: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Player: {
    title: AnimeTitle;
    episodeId?: string;
    episodeOrdinal?: number;
    providerId?: string;
    voiceoverId?: string;
    synced?: boolean;
    roomCode?: string;
    roomRole?: 'host' | 'guest';
  };
  /** Official embed player of a source that publishes a player link (Kodik). */
  EmbedPlayer: { url: string; title?: string };
  WatchTogether: undefined;
  Room: { roomId: string; code: string; isHost: boolean; title?: AnimeTitle; titleId?: string; episodeId?: string };
  Achievements: undefined;
  Customization: undefined;
  Effects: undefined;
  Backgrounds: undefined;
  ThemeStudio: undefined;
  CustomText: undefined;
  BannerStudio: { bannerId?: string } | undefined;
  Library: { purpose?: 'avatar' | 'banner' | 'background' | 'bannerImage' } | undefined;
  Providers: undefined;
  Cache: undefined;
  About: undefined;
};

declare global {
  namespace ReactNavigation {
    // Augmenting the library type is the documented react-navigation pattern.
    interface RootParamList extends RootStackParamList {
      __animAlc?: never;
    }
  }
}
