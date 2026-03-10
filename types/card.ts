export type CardStatus = 'thinking' | 'decided' | 'rejected';
export type CardPriority = 1 | 2 | 3;

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
  memo: string;
  priority: CardPriority;
  status: CardStatus;
  labels: string[];
  checklist: ChecklistItem[];
  images: string[];
  createdAt: number;
  updatedAt: number;
}

export type CreateCardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCardInput = Partial<Omit<Card, 'id' | 'createdAt' | 'updatedAt'>>;
