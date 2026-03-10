export interface Collection {
  id: string;
  name: string;
  icon: string;
  order: number;
  parentId: string | null;
  createdAt: number;
}

export type CreateCollectionInput = Omit<Collection, 'id' | 'createdAt' | 'order'>;
export type UpdateCollectionInput = Partial<Omit<Collection, 'id' | 'createdAt'>>;
