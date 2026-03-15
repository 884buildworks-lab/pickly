export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Card {
  id: string;
  collectionId: string;
  title: string;
  url?: string;
  thumbnail?: string;
  favicon?: string;
  memo: string;
  labels: string[];
  checklist: ChecklistItem[];
  images: string[];
  isRead: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CreateCardInput = Omit<Card, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>;
export type UpdateCardInput = Partial<Omit<Card, 'id' | 'createdAt' | 'updatedAt'>>;
