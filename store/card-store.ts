import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card, CreateCardInput, UpdateCardInput } from '@/types';

interface CardState {
  cards: Card[];

  // Actions
  addCard: (input: CreateCardInput) => Card;
  updateCard: (id: string, input: UpdateCardInput) => void;
  deleteCard: (id: string) => void;
  deleteCardsByCollectionId: (collectionId: string) => void;
  getCardById: (id: string) => Card | undefined;
  getCardsByCollectionId: (collectionId: string) => Card[];
  markAsRead: (id: string) => void;
  // Label helpers
  getAllLabels: () => string[];

  // Checklist actions
  toggleChecklistItem: (cardId: string, itemId: string) => void;
  addChecklistItem: (cardId: string, text: string) => void;
  removeChecklistItem: (cardId: string, itemId: string) => void;
  updateChecklistItem: (cardId: string, itemId: string, text: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useCardStore = create<CardState>()(
  persist(
    (set, get) => ({
      cards: [],

      addCard: (input) => {
        const now = Date.now();
        const newCard: Card = {
          ...input,
          id: generateId(),
          isRead: false,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          cards: [...state.cards, newCard],
        }));
        return newCard;
      },

      updateCard: (id, input) => {
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? { ...c, ...input, updatedAt: Date.now() } : c
          ),
        }));
      },

      deleteCard: (id) => {
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
        }));
      },

      deleteCardsByCollectionId: (collectionId) => {
        set((state) => ({
          cards: state.cards.filter((c) => c.collectionId !== collectionId),
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id && !c.isRead ? { ...c, isRead: true } : c
          ),
        }));
      },

      getCardById: (id) => {
        return get().cards.find((c) => c.id === id);
      },

      getCardsByCollectionId: (collectionId) => {
        return get().cards
          .filter((c) => c.collectionId === collectionId)
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      getAllLabels: () => {
        const labels = new Set<string>();
        get().cards.forEach((card) => {
          card.labels.forEach((label) => labels.add(label));
        });
        return Array.from(labels).sort();
      },

      toggleChecklistItem: (cardId, itemId) => {
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  checklist: card.checklist.map((item) =>
                    item.id === itemId ? { ...item, checked: !item.checked } : item
                  ),
                }
              : card
          ),
        }));
      },

      addChecklistItem: (cardId, text) => {
        const newItem = { id: generateId(), text, checked: false };
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? { ...card, checklist: [...card.checklist, newItem] }
              : card
          ),
        }));
      },

      removeChecklistItem: (cardId, itemId) => {
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  checklist: card.checklist.filter((item) => item.id !== itemId),
                }
              : card
          ),
        }));
      },

      updateChecklistItem: (cardId, itemId, text) => {
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  checklist: card.checklist.map((item) =>
                    item.id === itemId ? { ...item, text } : item
                  ),
                }
              : card
          ),
        }));
      },
    }),
    {
      name: 'pickly-cards',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
