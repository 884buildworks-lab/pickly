import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  // テーマ設定
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // 共有されたURL（一時的、永続化不要）
  sharedUrl: string | null;
  setSharedUrl: (url: string | null) => void;
  // ホーム画面の選択コレクション（null=すべて）
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
  // 保存時にオフラインDLを自動実行するか
  autoDownload: boolean;
  setAutoDownload: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),
      sharedUrl: null,
      setSharedUrl: (url) => set({ sharedUrl: url }),
      selectedCollectionId: null,
      setSelectedCollectionId: (id) => set({ selectedCollectionId: id }),
      autoDownload: false,
      setAutoDownload: (value) => set({ autoDownload: value }),
    }),
    {
      name: 'pickly-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        themeMode: state.themeMode,
        autoDownload: state.autoDownload,
        // sharedUrl は永続化しない
      }),
    }
  )
);
