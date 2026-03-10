import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry {
  html: string;
  cachedAt: number;
}

interface CacheState {
  entries: Record<string, CacheEntry>;
  setCacheEntry: (cardId: string, html: string) => void;
  clearCacheEntry: (cardId: string) => void;
  clearCacheEntries: (cardIds: string[]) => void;
  getCacheEntry: (cardId: string) => CacheEntry | undefined;
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      entries: {},

      setCacheEntry: (cardId, html) => {
        set((state) => ({
          entries: {
            ...state.entries,
            [cardId]: { html, cachedAt: Date.now() },
          },
        }));
      },

      clearCacheEntry: (cardId) => {
        set((state) => {
          const { [cardId]: _, ...rest } = state.entries;
          return { entries: rest };
        });
      },

      clearCacheEntries: (cardIds) => {
        set((state) => {
          const entries = { ...state.entries };
          for (const id of cardIds) {
            delete entries[id];
          }
          return { entries };
        });
      },

      getCacheEntry: (cardId) => {
        return get().entries[cardId];
      },
    }),
    {
      name: 'pickly-cache',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
