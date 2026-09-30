import { createPersistedStore } from '@/store/persistentStore';
import { StorageKeys } from '@/core/storage/storageKeys';
import { createDefaultProfile, type UserProfile } from '@/data/models/profile';

export interface ProfileState {
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setAvatar: (uri?: string, isGif?: boolean) => void;
  setBanner: (uri?: string, isGif?: boolean) => void;
  resetAll: () => void;
}

const defaults: ProfileState = {
  profile: createDefaultProfile(),
  updateProfile: () => undefined,
  setAvatar: () => undefined,
  setBanner: () => undefined,
  resetAll: () => undefined,
};

export function createProfileStore() {
  return createPersistedStore<ProfileState>(defaults, {
    namespace: StorageKeys.profile,
    version: 1,
    partialize: (state) => ({ profile: state.profile }),
    migrate: (state) => ({ profile: { ...createDefaultProfile(), ...((state as { profile?: UserProfile }).profile ?? {}) } }),
  });
}

export const profileStore = createProfileStore();

export const useProfileStore = profileStore.store;

export const profileActions = {
  updateProfile: (patch: Partial<UserProfile>) =>
    useProfileStore.setState((state) => ({
      profile: { ...state.profile, ...patch, updatedAt: Date.now() },
    })),
  setAvatar: (avatarUri?: string, avatarIsGif = false) =>
    useProfileStore.setState((state) => ({
      profile: { ...state.profile, avatarUri, avatarIsGif, updatedAt: Date.now() },
    })),
  setBanner: (bannerUri?: string, bannerIsGif = false) =>
    useProfileStore.setState((state) => ({
      profile: { ...state.profile, bannerUri, bannerIsGif, updatedAt: Date.now() },
    })),
  resetAll: () => profileStore.reset(),
};
