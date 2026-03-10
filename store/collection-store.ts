import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from '@/types';

interface CollectionState {
  collections: Collection[];
  lastUsedCollectionId: string | null;

  // Actions
  addCollection: (input: CreateCollectionInput) => Collection;
  updateCollection: (id: string, input: UpdateCollectionInput) => void;
  deleteCollection: (id: string) => void;
  reorderCollections: (orderedIds: string[]) => void;
  moveCollection: (id: string, direction: 'up' | 'down') => void;
  setLastUsedCollectionId: (id: string) => void;
  getCollectionById: (id: string) => Collection | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      collections: [],
      lastUsedCollectionId: null,

      addCollection: (input) => {
        const newCollection: Collection = {
          id: generateId(),
          name: input.name,
          icon: input.icon,
          parentId: input.parentId ?? null,
          order: get().collections.length,
          createdAt: Date.now(),
        };
        set((state) => ({
          collections: [...state.collections, newCollection],
        }));
        return newCollection;
      },

      updateCollection: (id, input) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, ...input } : c
          ),
        }));
      },

      deleteCollection: (id) => {
        set((state) => ({
          collections: state.collections
            .filter((c) => c.id !== id)
            .map((c, index) => ({ ...c, order: index })),
          lastUsedCollectionId:
            state.lastUsedCollectionId === id ? null : state.lastUsedCollectionId,
        }));
      },

      reorderCollections: (orderedIds) => {
        set((state) => ({
          collections: orderedIds
            .map((id, index) => {
              const collection = state.collections.find((c) => c.id === id);
              return collection ? { ...collection, order: index } : null;
            })
            .filter((c): c is Collection => c !== null),
        }));
      },

      moveCollection: (id, direction) => {
        set((state) => {
          const sorted = [...state.collections].sort((a, b) => a.order - b.order);
          const index = sorted.findIndex((c) => c.id === id);
          if (index === -1) return state;
          const swapIndex = direction === 'up' ? index - 1 : index + 1;
          if (swapIndex < 0 || swapIndex >= sorted.length) return state;
          // Swap order values
          const temp = sorted[index].order;
          sorted[index] = { ...sorted[index], order: sorted[swapIndex].order };
          sorted[swapIndex] = { ...sorted[swapIndex], order: temp };
          return { collections: sorted };
        });
      },

      setLastUsedCollectionId: (id) => {
        set({ lastUsedCollectionId: id });
      },

      getCollectionById: (id) => {
        return get().collections.find((c) => c.id === id);
      },
    }),
    {
      name: 'pickly-collections',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
